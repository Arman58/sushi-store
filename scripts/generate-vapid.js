/* eslint-disable @typescript-eslint/no-require-imports */
const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("Add these to .env.local and Vercel Environment Variables:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
