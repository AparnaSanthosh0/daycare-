const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI');
    await mongoose.connect(process.env.MONGODB_URI);
    const identifiers = [
      { username: 'AparnaX' },
      { username: 'Aparna' },
      { email: 'aparnasanthosh342@gmail.com' },
      { email: 'aparna@tinytots.com' },
    ];

    const passwords = ['Aparna123@X', 'Aparna123@'];

    for (const q of identifiers) {
      const user = await User.findOne(q);
      if (!user) {
        console.log(`No user for query: ${JSON.stringify(q)}`);
        continue;
      }
      console.log('---');
      console.log('Found user:', { id: user._id.toString(), username: user.username, email: user.email, role: user.role, isActive: user.isActive });
      for (const pwd of passwords) {
        try {
          const ok = await user.comparePassword(pwd);
          console.log(`comparePassword('${pwd}') =>`, ok);
        } catch (e) {
          console.log(`comparePassword error for ${pwd}:`, e.message);
        }
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
})();