import fs from "fs";
import path from "path";

async function scrapeBrands(page: number = 1, scrapeArray: any[] = []) {
  let responseLength = 0;
  const response = await fetch(`https://bikeindex.org:443/api/v3/manufacturers?page=${page}&per_page=100`);
  const data = await response.json();
  responseLength = data.manufacturers.length;
  console.log("finded pages: ", responseLength);
  scrapeArray.push(...data.manufacturers);
  if (responseLength < 100) {
    return scrapeArray;
  }
  return scrapeBrands(page + 1, scrapeArray);
}

function saveToJSON(arr: string[] = ["test"]) {
  const jsonFilePath = path.join("e", "bikebrands.json");
  fs.writeFile(jsonFilePath, JSON.stringify(arr, null, 2), (err) => {
    if (err) {
      console.error("Error writing file:", err);
    } else {
      console.log("--Succesfully created JSON!--");
    }
  });
}

async function main() {
  const result = await scrapeBrands();
  const brands = result.map((obj) => obj.name);
  saveToJSON(brands);
}

main();
