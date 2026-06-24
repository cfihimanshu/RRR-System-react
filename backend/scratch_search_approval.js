const fs = require('fs');
const path = require('path');

function searchDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            searchDirectory(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('/legal-requests/')) {
                console.log(`Found file: ${filePath}`);
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.includes('/legal-requests/')) {
                        console.log(`  Line ${idx+1}: ${line.trim()}`);
                    }
                });
            }
        }
    });
}

searchDirectory(path.join(__dirname, '../frontend/src'));
