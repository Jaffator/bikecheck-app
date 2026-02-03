import prisma from "../backend_old/src_old/config/database.js";
import path from "node:path";

async function add() {
  const newUser = await prisma.users.create({
    data: {
      name: "Jarda",
    },
  });
  await prisma.$disconnect();
}

async function read() {
  const read = await prisma.bike_brands.findMany();
  console.log(read);
  await prisma.$disconnect();
}

async function del() {
  const del = await prisma.users.deleteMany();
  await prisma.$disconnect();
}

read();
// add();
// read();
// del();
