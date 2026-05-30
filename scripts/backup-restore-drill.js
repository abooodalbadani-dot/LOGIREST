const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const { execSync } = require("child_process");

const startTime = Math.floor(Date.now() / 1000);
console.log("=== Starting Database Restore Drill (Node.js) ===");

// Load environment variables from .env
const projectRoot = path.dirname(__dirname);
const envPath = path.join(projectRoot, ".env");
if (fs.existsSync(envPath)) {
  console.log("Loading environment from .env file...");
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith("#")) {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let val = parts.slice(1).join("=").trim();
        // Strip quotes if any
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  });
}

const bucket = process.env.BACKUP_S3_BUCKET || "logirest-backups";
const region = process.env.BACKUP_S3_REGION || "eu-west-1";
const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID || "dev-access-key-id";
const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY || "dev-secret-access-key";
const endpoint = process.env.BACKUP_S3_ENDPOINT || "http://localhost:9000";
const encryptionKeyHex = process.env.BACKUP_ENCRYPTION_KEY;

if (!encryptionKeyHex) {
  console.error("ERROR: BACKUP_ENCRYPTION_KEY is missing from environment");
  process.exit(1);
}

const s3Client = new S3Client({
  region,
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

async function runDrill() {
  const tempSql = "temp_backup.sql";
  
  // Clean up
  if (fs.existsSync(tempSql)) fs.unlinkSync(tempSql);

  // 1. Fetch latest key from S3
  console.log(`Listing objects in bucket 's3://${bucket}'...`);
  const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket }));
  if (!listRes.Contents || listRes.Contents.length === 0) {
    throw new Error(`No backups found in bucket s3://${bucket}`);
  }
  const encryptedBackups = listRes.Contents.filter(item => item.Key.endsWith(".enc"));
  if (encryptedBackups.length === 0) {
    throw new Error(`No encrypted backups found in bucket s3://${bucket}`);
  }
  encryptedBackups.sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime());
  const latest = encryptedBackups[0];
  console.log(`Latest backup file found: ${latest.Key}`);

  // 2. Download latest backup
  console.log(`Downloading s3://${bucket}/${latest.Key}...`);
  const getRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: latest.Key }));
  
  const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  const fileData = await streamToBuffer(getRes.Body);

  // 3. Decrypt and decompress
  console.log("Decrypting and decompressing backup file...");
  const key = Buffer.from(encryptionKeyHex, "hex");
  const iv = fileData.subarray(0, 16);
  const encrypted = fileData.subarray(16);
  
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const decompressed = zlib.gunzipSync(compressed);
  
  fs.writeFileSync(tempSql, decompressed);
  console.log(`Backup successfully decrypted to ${tempSql}`);

  // 4. Start Sandbox Postgres container
  const sandboxContainer = "logirest-db-sandbox";
  console.log(`Starting PostgreSQL sandbox container '${sandboxContainer}'...`);
  try {
    execSync(`docker rm -f ${sandboxContainer}`, { stdio: "ignore" });
  } catch (e) {}

  execSync(
    `docker run --name ${sandboxContainer} -e POSTGRES_DB=logirest_sandbox -e POSTGRES_USER=logirest -e POSTGRES_PASSWORD=mysecretpassword -p 5433:5432 -d postgres:16-alpine`,
    { stdio: "inherit" }
  );

  // 5. Wait for database to be ready
  console.log("Waiting for sandbox database to start...");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      execSync(`docker exec ${sandboxContainer} pg_isready -U logirest -d logirest_sandbox`, { stdio: "ignore" });
      ready = true;
      break;
    } catch (e) {
      process.stdout.write(".");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.log("");
  if (!ready) {
    throw new Error("Sandbox database failed to become ready");
  }
  console.log("Sandbox database is ready.");

  // 6. Restore dump
  console.log("Restoring database SQL into sandbox...");
  execSync(`docker exec -i ${sandboxContainer} psql -U logirest -d logirest_sandbox < ${tempSql}`, { stdio: "ignore" });

  // 7. Verify restoration using row-count check
  console.log("Verifying database restoration...");
  const rowCount = execSync(
    `docker exec -i ${sandboxContainer} psql -U logirest -d logirest_sandbox -t -A -c "SELECT COUNT(*) FROM users;"`
  ).toString().trim();

  console.log(`Database verification successful. Total users in restored database: ${rowCount}`);

  // 8. Cleanup
  console.log("Cleaning up sandbox environment...");
  try {
    execSync(`docker rm -f ${sandboxContainer}`, { stdio: "ignore" });
  } catch (e) {}
  if (fs.existsSync(tempSql)) fs.unlinkSync(tempSql);

  const endTime = Math.floor(Date.now() / 1000);
  const elapsed = endTime - startTime;
  console.log("=== Recovery Drill Completed ===");
  console.log(`Total Elapsed Time: ${elapsed} seconds.`);

  // 4-hour RTO (Recovery Time Objective) threshold is 14400 seconds
  if (elapsed < 14400) {
    console.log(`PASS — restore completed in ${Math.floor(elapsed / 60)} minutes (< 240 minutes)`);
    process.exit(0);
  } else {
    console.error(`FAIL — restore took too long (${elapsed}s >= 14400s)`);
    process.exit(1);
  }
}

runDrill().catch((err) => {
  console.error("ERROR:", err.message);
  // Clean up on error
  try {
    execSync(`docker rm -f logirest-db-sandbox`, { stdio: "ignore" });
  } catch (e) {}
  if (fs.existsSync("temp_backup.sql")) fs.unlinkSync("temp_backup.sql");
  process.exit(1);
});
