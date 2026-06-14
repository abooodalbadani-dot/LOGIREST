const fs = require('fs');
const https = require('https');

const url = 'https://github.com/alif-type/amiri/raw/master/Amiri-Bold.ttf';

https.get(url, (res) => {
  if (res.statusCode === 302 || res.statusCode === 301) {
    https.get(res.headers.location, (res2) => {
      let data = [];
      res2.on('data', chunk => data.push(chunk));
      res2.on('end', () => {
        const buffer = Buffer.concat(data);
        fs.writeFileSync('Amiri-Bold.base64', buffer.toString('base64'));
        console.log('Downloaded and converted Amiri-Bold to base64! Size:', buffer.length);
      });
    });
  } else {
    let data = [];
    res.on('data', chunk => data.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(data);
      fs.writeFileSync('Amiri-Bold.base64', buffer.toString('base64'));
      console.log('Downloaded and converted Amiri-Bold to base64! Size:', buffer.length);
    });
  }
}).on('error', err => {
  console.error('Error downloading:', err.message);
});
