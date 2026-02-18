import fs from 'fs';
import path from 'path';
import https from 'https';

const BASE_URL = "https://cdn.jsdelivr.net/gh/FluffyStuff/riichi-mahjong-tiles@master/Regular";
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'tiles');

const TILES = [
  // Man
  ...Array.from({ length: 9 }, (_, i) => `Man${i + 1}.svg`),
  // Pin
  ...Array.from({ length: 9 }, (_, i) => `Pin${i + 1}.svg`),
  // Sou
  ...Array.from({ length: 9 }, (_, i) => `Sou${i + 1}.svg`),
  // Honors
  'Ton.svg', 'Nan.svg', 'Shaa.svg', 'Pei.svg',
  'Haku.svg', 'Hatsu.svg', 'Chun.svg'
];

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`Starting download of ${TILES.length} tiles to ${OUTPUT_DIR}...`);

const downloadFile = (filename) => {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/${filename}`;
        const filePath = path.join(OUTPUT_DIR, filename);
        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${filename}: Status Code ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${filename}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); // Delete partial file
            reject(err);
        });
    });
};

(async () => {
    try {
        await Promise.all(TILES.map(downloadFile));
        console.log("All downloads completed successfully!");
    } catch (error) {
        console.error("Download failed:", error);
        process.exit(1);
    }
})();
