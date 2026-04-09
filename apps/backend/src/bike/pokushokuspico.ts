// import path from 'path';
// import { randomUUID } from 'crypto';

// async function storeFromExternalUrl(url: string): Promise<string> {
//   const response = await fetch(url);
//   if (!response.ok) {
//     throw new BadRequestException(`Failed to download image: ${response.statusText}`);
//   }
//   try {
//     const image = await response.arrayBuffer();
//     const filename = `${randomUUID()}.jpg`;
//     const buffer = Buffer.from(image);
//     return await this.storageService.uploadFile(buffer, filename, 'bikes', 'image/jpeg');
//   } catch (error) {
//     const message = error instanceof Error ? error.message : String(error);
//     throw new BadRequestException(`Failed to upload image to cloud: ${message}`);
//   }
// }

// const s = 'https://pub-4ee94249a97347858cdaf97e203e0980.r2.dev/bikes/d91bab0b-8161-4a4f-aa6d-6b1a5bf18e7f.jpg';
// const result = s.includes('https://pub-4ee94249a97347858cdaf97e203e0980.r2.dev');
// console.log(result);
// const arr = [1, 2, 3, 4];
// // const arr2 = arr.filter((item) => item === 1)[0];
// // console.log(arr2);
// // const string1 = 'Front Derailleur';
// // string1.includes('Front') ? console.log('yes') : console.log('no');
// arr.push(5, 6);
// console.log(arr);
const arr = 'derailleur';
const word = 'rear derailleur';
const arr2 = [1];
console.log(arr2.length);
const result = word.includes(arr);
console.log(result);
