import { read } from "node:fs";
import prisma from "../backend_old/src_old/config/database.js";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { json } from "node:stream/consumers";

type BikeBrand = { bike_brand: string };

async function loadJson(): Promise<BikeBrand[]> {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filename = path.join(dirname, "bikebrands.json");
  const data = await fs.readFile(filename);
  const brands = JSON.parse(data.toString());
  const modifiedBrands = brands.map((brand: string) => {
    const obj = { bike_brand: brand };
    return obj;
  });
  return modifiedBrands;
}

async function addbrands() {
  try {
    const brandData = await loadJson();
    const addbrand = await prisma.bike_brands.createMany({
      data: brandData,
    });
    console.log(addbrand);
  } catch (error) {
    console.log(error);
  } finally {
    prisma.$disconnect();
  }
}

// addbrands();

async function read_brands() {
  const result = await prisma.bike_brands.findMany({
    where: {
      bike_brand: {
        startsWith: "p",
        mode: "insensitive",
      },
    },
  });
  //   console.log(result);
  const find = result.find((value) => value.bike_brand === "Pivot");
  console.log(find?.id);
}

read_brands();
