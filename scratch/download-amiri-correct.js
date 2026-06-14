const fs = require('fs');
const https = require('https');
const path = require('path');

const fonts = [
  {
    name: 'Amiri-Regular',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf',
    base64Path: path.join(__dirname, '../Amiri-Regular.base64')
  },
  {
    name: 'Amiri-Bold',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Bold.ttf',
    base64Path: path.join(__dirname, '../Amiri-Bold.base64')
  }
];

function downloadFont(font) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${font.name} from ${font.url}...`);
    https.get(font.url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${font.name}: status code ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        fs.writeFileSync(font.base64Path, base64);
        console.log(`Saved ${font.name} base64 to ${font.base64Path} (Size: ${buffer.length} bytes)`);
        resolve(base64);
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    const regularBase64 = await downloadFont(fonts[0]);
    const boldBase64 = await downloadFont(fonts[1]);
    
    const outputFilePath = path.join(__dirname, '../apps/web/src/lib/export/arabicFontsBase64.ts');
    
    const fileContent = `export const AMIRI_REGULAR_BASE64 = '${regularBase64}';\n\nexport const AMIRI_BOLD_BASE64 = '${boldBase64}';\n`;
    
    fs.writeFileSync(outputFilePath, fileContent);
    console.log(`Successfully generated ${outputFilePath}`);
  } catch (err) {
    console.error('Error running script:', err);
  }
}

run();
