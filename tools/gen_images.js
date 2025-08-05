const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'waifu_links.txt');
const outputFile = path.join(__dirname, '../public/images.json');

const lines = fs.readFileSync(inputFile, 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean);

const waifus = lines.map((line, i) => {
  const [url, percentStr] = line.split(',').map(v => v.trim());
  const percent = parseFloat(percentStr) || 0;

  return {
    name: `Waifu ${i + 1}`,
    url,
    percent
  };
});

fs.writeFileSync(outputFile, JSON.stringify(waifus, null, 2));
console.log(`✅ Berhasil membuat images.json dengan ${waifus.length} waifu`);
