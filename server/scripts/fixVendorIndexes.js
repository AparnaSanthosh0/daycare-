// Fix vendor collection indexes: remove legacy singletonKey unique index
// and enforce only one approved vendor via partial unique index.
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const coll = db.collection('vendors');

  const indexes = await coll.indexes();
  console.log('Current indexes:', indexes);

  // Drop legacy unique index on singletonKey if present
  const legacy = indexes.find(i => i.name === 'singletonKey_1');
  if (legacy) {
    console.log('Dropping legacy index singletonKey_1 ...');
    await coll.dropIndex('singletonKey_1');
  } else {
    console.log('Legacy index singletonKey_1 not found.');
  }

  // Ensure partial unique index to allow many pending/rejected but only one approved
  const targetName = 'unique_approved_vendor';
  const exists = indexes.find(i => i.name === targetName);
  if (!exists) {
    console.log('Creating partial unique index: only one approved vendor allowed...');
    await coll.createIndex(
      { status: 1 },
      { unique: true, name: targetName, partialFilterExpression: { status: 'approved' } }
    );
  } else {
    console.log('Partial unique index already exists.');
  }

  const final = await coll.indexes();
  console.log('Final indexes:', final);

  await mongoose.disconnect();
  console.log('Done fixing vendor indexes.');
})();