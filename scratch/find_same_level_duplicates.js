const fs = require('fs');

function findSameLevelDuplicates(obj, path = '') {
    const keys = Object.keys(obj);
    const seen = new Set();
    const duplicates = [];

    keys.forEach(key => {
        if (seen.has(key)) {
            duplicates.push(`${path}.${key}`);
        }
        seen.add(key);

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            duplicates.push(...findSameLevelDuplicates(obj[key], path ? `${path}.${key}` : key));
        }
    });

    return duplicates;
}

const data = JSON.parse(fs.readFileSync('messages/ar.json', 'utf8'));
const dups = findSameLevelDuplicates(data);

if (dups.length > 0) {
    console.log('Same-level duplicates found:');
    dups.forEach(d => console.log(d));
} else {
    console.log('No same-level duplicates found.');
}
