import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import * as zlib from 'zlib';

const execPromise = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3Client: S3Client;

  constructor(private readonly prisma: PrismaService) {
    const region = process.env.BACKUP_S3_REGION || 'eu-west-1';

    if (process.env.NODE_ENV === 'production') {
      if (
        !process.env.BACKUP_S3_ACCESS_KEY_ID ||
        !process.env.BACKUP_S3_SECRET_ACCESS_KEY
      ) {
        throw new Error(
          'FATAL: BACKUP_S3_ACCESS_KEY_ID and BACKUP_S3_SECRET_ACCESS_KEY must be set in production.',
        );
      }
    }

    const accessKeyId =
      process.env.BACKUP_S3_ACCESS_KEY_ID || 'dev-access-key-id';
    const secretAccessKey =
      process.env.BACKUP_S3_SECRET_ACCESS_KEY || 'dev-secret-access-key';

    let endpoint = process.env.BACKUP_S3_ENDPOINT;
    if (!endpoint) {
      // In Docker network, MinIO is 'minio', but locally on host it's 'localhost'
      endpoint =
        process.env.NODE_ENV === 'production'
          ? 'http://minio:9000'
          : 'http://localhost:9000';
    }

    this.s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true, // required for MinIO / LocalStack
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Run PostgreSQL backup, encrypt, and upload to S3.
   */
  async runBackup(): Promise<{ key: string; size: number }> {
    this.logger.log('Starting automated database backup...');

    const dbUrlString = process.env.DATABASE_URL;
    if (!dbUrlString) {
      throw new Error('DATABASE_URL environment variable is missing');
    }

    // Parse DATABASE_URL
    let host = '127.0.0.1';
    let port = '5432';
    let username = 'logirest';
    let password = '';
    let database = 'logirest';

    try {
      const dbUrl = new URL(dbUrlString);
      host = dbUrl.hostname || host;
      port = dbUrl.port || port;
      username = dbUrl.username || username;
      password = decodeURIComponent(dbUrl.password || '');
      database = dbUrl.pathname.substring(1) || database;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Failed parsing DATABASE_URL using URL parser: ${msg}. Using default params.`,
      );
    }

    let dumpData: Buffer;

    // Try executing local pg_dump
    try {
      this.logger.log(`Executing local pg_dump on host ${host}...`);
      const { stdout } = await execPromise(
        `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p`,
        {
          env: { ...process.env, PGPASSWORD: password },
          maxBuffer: 1024 * 1024 * 100, // 100MB
          encoding: 'buffer',
        },
      );
      dumpData = stdout;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Local pg_dump failed: ${errMsg}. Trying docker exec fallback...`,
      );
      try {
        const containerName = process.env.BACKUP_DB_CONTAINER || 'logirest-db';
        const { stdout } = await execPromise(
          `docker exec -i ${containerName} pg_dump -U ${username} -d ${database} -F p`,
          {
            env: { ...process.env, PGPASSWORD: password },
            maxBuffer: 1024 * 1024 * 100,
            encoding: 'buffer',
          },
        );
        dumpData = stdout;
      } catch (dockerErr: unknown) {
        const dockerMsg =
          dockerErr instanceof Error ? dockerErr.message : String(dockerErr);
        this.logger.error(`Docker pg_dump fallback failed: ${dockerMsg}`);
        throw new Error(
          `Database dump failed: both local pg_dump and docker fallback failed.`,
        );
      }
    }

    if (!dumpData || dumpData.length === 0) {
      throw new Error('Database dump returned empty data');
    }

    this.logger.log(
      `Database dumped successfully. Original size: ${dumpData.length} bytes.`,
    );

    // 1. Gzip compression
    const compressed = zlib.gzipSync(dumpData);
    this.logger.log(
      `Data compressed with gzip. Compressed size: ${compressed.length} bytes.`,
    );

    // 2. Encryption
    const encryptionKeyHex = process.env.BACKUP_ENCRYPTION_KEY;
    if (!encryptionKeyHex || encryptionKeyHex.length !== 64) {
      throw new Error(
        'BACKUP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
    }
    const key = Buffer.from(encryptionKeyHex, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const encrypted = Buffer.concat([
      cipher.update(compressed),
      cipher.final(),
    ]);

    // Prepend the IV (16 bytes) to the encrypted payload so it can be decrypted during restore
    const finalPayload = Buffer.concat([iv, encrypted]);
    const finalSize = finalPayload.length;
    this.logger.log(
      `Data encrypted. Final payload size (including IV): ${finalSize} bytes.`,
    );

    // 3. Upload to S3
    const bucketName = process.env.BACKUP_S3_BUCKET || 'logirest-backups';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `logirest_backup_${timestamp}.sql.gz.enc`;

    // Ensure bucket exists
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (e: unknown) {
      const s3Err = e as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      if (
        s3Err.name === 'NotFound' ||
        s3Err.$metadata?.httpStatusCode === 404
      ) {
        this.logger.log(`Bucket '${bucketName}' does not exist. Creating...`);
        await this.s3Client.send(
          new CreateBucketCommand({ Bucket: bucketName }),
        );
      } else {
        throw e;
      }
    }

    this.logger.log(`Uploading to S3: s3://${bucketName}/${s3Key}...`);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: finalPayload,
        ContentType: 'application/octet-stream',
      }),
    );

    this.logger.log(
      'S3 Upload complete. Updating database tracking timestamp...',
    );

    // 4. Update DB setting
    await this.prisma.systemSetting.upsert({
      where: { key: 'last_backup_at' },
      update: {
        value: new Date().toISOString(),
        version: { increment: 1 },
      },
      create: {
        key: 'last_backup_at',
        value: new Date().toISOString(),
        version: 1,
      },
    });

    this.logger.log(`Database backup run successfully. Saved key: ${s3Key}`);
    return { key: s3Key, size: finalSize };
  }

  /**
   * Get backup health status and statistics.
   */
  async getBackupStatus(): Promise<{
    status: 'ok' | 'degraded';
    lastBackupAt: string | null;
    ageHours: number | null;
  }> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'last_backup_at' },
      });

      if (!setting || !setting.value) {
        return {
          status: 'degraded',
          lastBackupAt: null,
          ageHours: null,
        };
      }

      const lastBackupDate = new Date(setting.value);
      if (isNaN(lastBackupDate.getTime())) {
        return {
          status: 'degraded',
          lastBackupAt: null,
          ageHours: null,
        };
      }

      const now = new Date();
      const ageMs = now.getTime() - lastBackupDate.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      return {
        status: ageHours > 26 ? 'degraded' : 'ok',
        lastBackupAt: lastBackupDate.toISOString(),
        ageHours: Number(ageHours.toFixed(1)),
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to get backup status: ${msg}`);
      return {
        status: 'degraded',
        lastBackupAt: null,
        ageHours: null,
      };
    }
  }
}
