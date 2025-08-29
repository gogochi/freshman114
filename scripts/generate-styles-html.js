const fs = require('fs');
const path = require('path');

const inFile = path.resolve(__dirname, '..', 'build', 'tailwind.css');
const outFile = path.resolve(__dirname, '..', 'styles.html');

function ensureFile(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function main() {
  if (!fs.existsSync(inFile)) {
    console.error('Missing input CSS:', inFile);
    process.exit(1);
  }
  const css = fs.readFileSync(inFile, 'utf8');
  // Apps Script 會以 include 的方式把 CSS 置入 <style> 內部
  ensureFile(outFile);
  fs.writeFileSync(outFile, css, 'utf8');
  console.log('Generated', outFile, `(${css.length} bytes)`);
}

main();

