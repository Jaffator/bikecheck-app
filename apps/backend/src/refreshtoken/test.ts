// import { RefreshTokenRepository } from './refreshtoken.repository';
// import { PrismaService } from '../../shared/prisma.service';

// async function test() {
//   const prisma = new PrismaService();
//   await prisma.$connect();

//   const repo = new RefreshTokenRepository(prisma);
//   const data = await repo.getAll();
//   const diff = new Date().getTime() - data[1].expires_at.getTime();
//   console.log('diff: ', diff);
//   console.log('Get Time: ', data[1].expires_at?.getTime());
//   console.log(msToHrs(diff));
//   await prisma.$disconnect();
// }
// test().catch((error) => {
//   console.error('Error:', error);
//   process.exit(1);
// });

// function msToHrs(ms: number) {
//   const hours = ms / 1000 / 60 / 60;
//   return Math.abs(hours);
// }
const futureDate = new Date();
futureDate.setDate(futureDate.getMinutes() + 5);
console.log(futureDate);
