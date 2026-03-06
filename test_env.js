const fs = require('fs');
const content = fs.readFileSync('.env', 'utf8');
console.log(content.split('\n').slice(0, 15).join('\n'));
