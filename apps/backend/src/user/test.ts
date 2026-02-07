// // import 'dotenv/config';
// import { PrismaClient } from '../../generated/prisma/client';
// import { PrismaPg } from '@prisma/adapter-pg';
// import { Pool } from 'pg';
// import 'dotenv/config';

// const connectionString = process.env.DATABASE_URL;

// const pool = new Pool({ connectionString });
// const adapter = new PrismaPg(pool);

// const prisma = new PrismaClient({ adapter });
// async function main() {
//   const user = await prisma.users.findUnique({ where: { id: 17 } });
//   const expired = user?.created_at;
//   const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dní
//   console.log(expiresAt);
//   const first = new Date().getTime();
//   const second = new Date().getTime();
//   console.log('first', first);
//   console.log('second', second);
//   if (first === second) {
//     console.log('before');
//   } else {
//     console.log('ok');
//   }
// }
// main();
// type User = { id: number; email: string; password_hash: string | null };

// export function getuser(): User {
//   return {
//     id: 1,
//     email: 'asas',
//     password_hash: 'asas',
//   };
// }
// const secret = process.env['JWT_SECRET'];
// console.log(secret);
// const user = {
//   email: 'jardalufi',
//   googleid: 123464,
//   password: null,
// };
// const email = 'jardalufi';

// if (!user.password && user.googleid && user.email === email) {
//   console.log('yes');
// } else {
//   console.log('no');
// }
