import fs from 'fs/promises';
import path from 'path';
import { BACKEND_ROOT } from 'src/config/path';
import { BIKE_IMAGES_DIR } from 'src/config/path';
const url = 'http://d2yn9m4p3q9iyv.cloudfront.net/orbea/2023/rallon-m20/thumbs/1000/2a046.webp';

async function downloadImage(url: string) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const filename = path.join(__dirname, 'downloaded_image.webp');
    console.log(filename);
    await fs.writeFile(filename, Buffer.from(buffer));
    console.log(`Image downloaded and saved as ${filename}`);
  } catch (error) {
    console.error('Error downloading image:', error);
  }
}

downloadImage(url).catch(console.error);
console.log(BACKEND_ROOT);
console.log(BIKE_IMAGES_DIR);

let data = {
  url: 'blabla',
  num: 123,
  name: 'jarda',
};

data = { ...data, num: 5 };
console.log(data);
