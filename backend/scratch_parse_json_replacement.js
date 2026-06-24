const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'step_1593_raw.txt');
const rawContent = fs.readFileSync(filePath, 'utf8');

// Find the start of the JSON object that represents the step
const startObjIdx = rawContent.indexOf('{');
if (startObjIdx === -1) {
    console.log('No JSON object found.');
    process.exit(1);
}

// Find the end of this line/JSON object
const endLineIdx = rawContent.indexOf('\n');
const line = rawContent.substring(0, endLineIdx);

try {
    const data = JSON.parse(line);
    const replacement = data.tool_calls[0].args.ReplacementContent;
    fs.writeFileSync(path.join(__dirname, 'step_1593_clean.jsx'), replacement, 'utf8');
    console.log('Successfully parsed and wrote step_1593_clean.jsx');
} catch (e) {
    console.error('JSON Parse error:', e);
}
