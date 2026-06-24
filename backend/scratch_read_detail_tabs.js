const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/tabs/CaseMasterTab.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('Lines 5580 to 6040 of CaseMasterTab.jsx:');
const startLine = 5580;
const endLine = 6040;
for (let i = startLine - 1; i < endLine; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
