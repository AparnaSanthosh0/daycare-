// Diagnostics: list vendor collection indexes and show sample duplicates by email/license
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const coll = db.collection('vendors');

  console.log('Indexes on vendors:');
  console.log(await coll.indexes());

  // Find duplicates by email
  console.log('\nChecking duplicates by email...');
  const dupEmail = await coll.aggregate([
    { $group: { _id: '$email', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
    { $limit: 10 }
  ]).toArray();
  console.log(dupEmail);

  // Find duplicates by businessLicenseNumber
  console.log('\nChecking duplicates by businessLicenseNumber...');
  const dupLic = await coll.aggregate([
    { $group: { _id: '$businessLicenseNumber', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
    { $limit: 10 }
  ]).toArray();
  console.log(dupLic);

  await mongoose.disconnect();
  console.log('\nDone.');
})();