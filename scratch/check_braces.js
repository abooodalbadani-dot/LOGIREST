
const fs = require('fs');
const content = fs.readFileSync('apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/count/StocktakeCountClient.tsx', 'utf8');

function checkBraces(text) {
    let stack = [];
    let lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let j = 0; j < line.length; j++) {
            let char = line[j];
            if (char === '{' || char === '(' || char === '[') {
                stack.push({ char, line: i + 1, col: j + 1 });
            } else if (char === '}' || char === ')' || char === ']') {
                if (stack.length === 0) {
                    console.log(`Unmatched closing ${char} at line ${i + 1}, col ${j + 1}`);
                    continue;
                }
                let last = stack.pop();
                if ((char === '}' && last.char !== '{') ||
                    (char === ')' && last.char !== '(') ||
                    (char === ']' && last.char !== '[')) {
                    console.log(`Mismatch: opened ${last.char} at line ${last.line} but closed with ${char} at line ${i + 1}, col ${j + 1}`);
                }
            }
        }
    }
    while (stack.length > 0) {
        let last = stack.pop();
        console.log(`Unclosed ${last.char} opened at line ${last.line}, col ${last.col}`);
    }
}

checkBraces(content);
