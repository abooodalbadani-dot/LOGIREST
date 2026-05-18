const fs = require('fs');

function inspectJSON(lang) {
  const filePath = `apps/web/messages/${lang}.json`;
  const fileContent = fs.readFileSync(filePath, 'utf8');
  try {
    const data = JSON.parse(fileContent);
    console.log(`--- ${lang}.json ---`);
    console.log('Is "common" key present?', 'common' in data);
    if ('common' in data) {
      console.log('Keys under "common":', Object.keys(data.common));
      console.log('Is "fields" present under "common"?', 'fields' in data.common);
      if ('fields' in data.common) {
        console.log('Keys under "common.fields":', data.common.fields);
      }
    }
  } catch (err) {
    console.error(`Error parsing ${lang}.json:`, err.message);
  }
}

inspectJSON('en');
inspectJSON('ar');
