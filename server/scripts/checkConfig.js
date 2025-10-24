#!/usr/bin/env node

require('dotenv').config();

console.log('🔍 Current Email Configuration:');
console.log('================================');
console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST}`);
console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT}`);
console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS}`);
console.log(`EMAIL_PASS Length: ${process.env.EMAIL_PASS?.length || 'undefined'}`);
console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM}`);

console.log('\n🔧 Gmail App Password Format Check:');
const pass = process.env.EMAIL_PASS || '';
console.log(`- Contains only letters/numbers: ${/^[a-zA-Z0-9]+$/.test(pass)}`);
console.log(`- Length is 16 characters: ${pass.length === 16}`);
console.log(`- No spaces: ${!pass.includes(' ')}`);
console.log(`- All lowercase: ${pass === pass.toLowerCase()}`);

if (pass.length === 16 && !pass.includes(' ') && /^[a-zA-Z0-9]+$/.test(pass)) {
  console.log('\n✅ App password format looks correct!');
} else {
  console.log('\n❌ App password format issues detected');
  console.log('💡 Gmail app passwords should be 16 characters, no spaces, lowercase letters and numbers only');
}
