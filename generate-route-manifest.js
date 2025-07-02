const fs = require('fs');
const path = require('path');

const routeDir = path.join(__dirname, 'data', 'route');
const outputDir = path.join(__dirname, 'public');
const outputPath = path.join(outputDir, 'route-list.json');

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  const files = fs.readdirSync(routeDir);

  const routeList = files
    .filter(file => file.endsWith('.json') || file.endsWith('.geojson'))
    .map(file => {
      // ファイル名から拡張子を除いたものをnameとする
      const name = path.basename(file, path.extname(file));
      // アプリケーションから見た相対パス
      const relativePath = `./data/route/${file}`;
      return { name, path: relativePath };
    });

  fs.writeFileSync(outputPath, JSON.stringify(routeList, null, 2));
  console.log(`Successfully generated route list at ${outputPath}`);
  console.log('Found routes:', routeList.map(r => r.name).join(', '));

} catch (error) {
  console.error('Error generating route list:', error);
  // エラーが発生した場合、空のリストを作成してビルドが失敗しないようにする
  fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
}
