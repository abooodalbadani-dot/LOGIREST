const fs = require('fs');
function findFiles(dir, cb) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const res = require('path').resolve(dir, dirent.name);
    if (dirent.isDirectory()) findFiles(res, cb);
    else if (res.endsWith('.controller.ts')) cb(res);
  });
}
findFiles('src', f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes("CurrentUser(\\'role\\')")) {
    fs.writeFileSync(f, content.replace(/CurrentUser\(\\'role\\'\)/g, "CurrentUser('role')"));
  }
});
