// import 'dotenv/config';

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
console.log(process.env.NODE_ENV === 'production');
