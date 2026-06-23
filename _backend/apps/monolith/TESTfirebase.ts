import 'dotenv/config';

const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 as string, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(json);
console.log('FIREBASE_SERVICE_ACCOUNT', serviceAccount);
