import { connectToDB } from './connectDB_forTesting/connectDB';

const prisma = connectToDB();
const result = await prisma.component_groups.findMany({});
console.log(result);
