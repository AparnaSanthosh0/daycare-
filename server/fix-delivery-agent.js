const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const PlatformSettings = require('./models/PlatformSettings');

async function fixDeliveryAgent() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB');

    // Find delivery agent
    const deliveryAgent = await User.findOne({ 
      role: 'staff',
      'staff.staffType': 'delivery'
    });

    if (!deliveryAgent) {
      console.log('❌ No delivery agent found!');
      console.log('\nSearching for any staff with delivery type...');
      
      const anyStaff = await User.findOne({ role: 'staff' });
      if (anyStaff) {
        console.log(`\n✅ Found staff: ${anyStaff.firstName} ${anyStaff.lastName}`);
        console.log(`   Current staffType: ${anyStaff.staff?.staffType || 'NOT SET'}`);
        console.log(`   Converting to delivery agent...`);
        
        anyStaff.staff = anyStaff.staff || {};
        anyStaff.staff.staffType = 'delivery';
        anyStaff.staff.deliveryArea = ['Downtown', 'North', 'South', 'East', 'West'];
        anyStaff.staff.availability = 'available';
        anyStaff.staff.currentDeliveries = 0;
        anyStaff.staff.maxConcurrentDeliveries = 3;
        anyStaff.staff.rating = 4.5;
        anyStaff.staff.completedDeliveries = 0;
        anyStaff.staff.currentLocation = {
          coordinates: { lat: 40.7128, lng: -74.0060 },
          updatedAt: new Date()
        };
        anyStaff.isActive = true;
        
        await anyStaff.save();
        console.log('✅ Staff converted to delivery agent successfully!');
      } else {
        console.log('❌ No staff found. Please create a staff member first.');
        process.exit(1);
      }
      
      // Fetch the updated agent
      const updatedAgent = await User.findById(anyStaff._id);
      console.log('\n📋 Updated Agent Details:');
      console.log(`   Name: ${updatedAgent.firstName} ${updatedAgent.lastName}`);
      console.log(`   Email: ${updatedAgent.email}`);
      console.log(`   staffType: ${updatedAgent.staff.staffType}`);
      console.log(`   deliveryArea: ${updatedAgent.staff.deliveryArea.join(', ')}`);
      console.log(`   availability: ${updatedAgent.staff.availability}`);
      console.log(`   isActive: ${updatedAgent.isActive}`);
    } else {
      console.log(`\n✅ Delivery agent found: ${deliveryAgent.firstName} ${deliveryAgent.lastName}`);
      console.log(`   Email: ${deliveryAgent.email}`);
      console.log(`   staffType: ${deliveryAgent.staff.staffType}`);
      console.log(`   deliveryArea: ${deliveryAgent.staff.deliveryArea?.join(', ') || 'NOT SET'}`);
      console.log(`   availability: ${deliveryAgent.staff.availability}`);
      console.log(`   isActive: ${deliveryAgent.isActive}`);

      // Fix missing fields
      let needsUpdate = false;
      
      if (!deliveryAgent.staff.deliveryArea || deliveryAgent.staff.deliveryArea.length === 0) {
        console.log('\n⚠️  No delivery areas set. Adding all zones...');
        deliveryAgent.staff.deliveryArea = ['Downtown', 'North', 'South', 'East', 'West'];
        needsUpdate = true;
      }
      
      if (deliveryAgent.staff.availability === 'offline') {
        console.log('⚠️  Agent is offline. Setting to available...');
        deliveryAgent.staff.availability = 'available';
        needsUpdate = true;
      }
      
      if (!deliveryAgent.isActive) {
        console.log('⚠️  Agent is inactive. Activating...');
        deliveryAgent.isActive = true;
        needsUpdate = true;
      }
      
      if (!deliveryAgent.staff.currentLocation) {
        console.log('⚠️  No current location. Setting default...');
        deliveryAgent.staff.currentLocation = {
          coordinates: { lat: 40.7128, lng: -74.0060 },
          updatedAt: new Date()
        };
        needsUpdate = true;
      }
      
      if (deliveryAgent.staff.rating === undefined) {
        deliveryAgent.staff.rating = 4.5;
        needsUpdate = true;
      }
      
      if (deliveryAgent.staff.completedDeliveries === undefined) {
        deliveryAgent.staff.completedDeliveries = 0;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await deliveryAgent.save();
        console.log('✅ Agent configuration updated!');
      } else {
        console.log('✅ Agent configuration is correct!');
      }
    }

    // Check and enable auto-assignment
    console.log('\n📝 Checking PlatformSettings...');
    let settings = await PlatformSettings.findOne();
    
    if (!settings) {
      console.log('⚠️  No platform settings found. Creating with auto-assignment enabled...');
      settings = await PlatformSettings.create({
        autoAssignment: {
          enabled: true,
          algorithm: 'zone-based',
          considerRating: true,
          considerDistance: true,
          minRating: 3.0
        },
        commissions: {
          vendor: {
            defaultRate: 15,
            minimumRate: 10,
            maximumRate: 30
          },
          delivery: {
            platformShare: 20,
            agentShare: 80
          }
        },
        zones: [
          { name: 'Downtown', zipCodes: ['10001', '10002', '10003', '10004', '10005'] },
          { name: 'North', zipCodes: ['10010', '10011', '10012', '10013'] },
          { name: 'South', zipCodes: ['10020', '10021', '10022', '10023'] },
          { name: 'East', zipCodes: ['10030', '10031', '10032'] },
          { name: 'West', zipCodes: ['10040', '10041', '10042'] }
        ]
      });
      console.log('✅ Platform settings created with auto-assignment enabled!');
    } else {
      console.log(`✅ Platform settings found`);
      console.log(`   Auto-assignment enabled: ${settings.autoAssignment.enabled}`);
      
      if (!settings.autoAssignment.enabled) {
        console.log('⚠️  Auto-assignment is disabled. Enabling...');
        settings.autoAssignment.enabled = true;
        await settings.save();
        console.log('✅ Auto-assignment enabled!');
      }
    }

    console.log('\n✅ All checks complete!');
    console.log('\n📌 Summary:');
    console.log('   - Delivery agent configured ✅');
    console.log('   - Auto-assignment enabled ✅');
    console.log('   - Agent availability: available ✅');
    console.log('   - Delivery areas: All zones ✅');
    console.log('\n🚀 The delivery agent is now ready to receive assignments!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

fixDeliveryAgent();
