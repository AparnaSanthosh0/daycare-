const mongoose = require('mongoose');
const crypto = require('crypto');

const blockchainSchema = new mongoose.Schema({
  blockNumber: { 
    type: Number, 
    required: true,
    unique: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  dataType: { 
    type: String, 
    required: true,
    enum: ['vaccination', 'incident', 'payment', 'attendance']
  },
  data: {
    // Vaccination specific fields
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' },
    childName: String,
    vaccine: String,
    vaccineName: String,
    date: Date,
    batchNumber: String,
    provider: String,
    location: String,
    nextDoseDate: Date,
    administeredBy: String,
    status: {
      type: String,
      enum: ['completed', 'scheduled', 'overdue'],
      default: 'completed'
    },
    notes: String,
    
    // General fields for other data types
    description: String,
    amount: Number,
    reference: String
  },
  previousHash: { 
    type: String, 
    default: '0' 
  },
  hash: String,
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  verified: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-calculate hash before saving (this makes it blockchain!)
blockchainSchema.pre('save', function(next) {
  const blockData = JSON.stringify({
    blockNumber: this.blockNumber,
    timestamp: this.timestamp,
    dataType: this.dataType,
    data: this.data,
    previousHash: this.previousHash
  });
  
  // Create SHA-256 hash
  this.hash = crypto.createHash('sha256').update(blockData).digest('hex');
  next();
});

// Method to verify block integrity
blockchainSchema.methods.isValid = function(previousBlock) {
  if (!previousBlock) return true;
  return this.previousHash === previousBlock.hash;
};

// Static method to get next block number
blockchainSchema.statics.getNextBlockNumber = async function() {
  const lastBlock = await this.findOne().sort({ blockNumber: -1 });
  return lastBlock ? lastBlock.blockNumber + 1 : 1;
};

// Static method to verify entire chain
blockchainSchema.statics.verifyChain = async function() {
  const blocks = await this.find().sort({ blockNumber: 1 });
  
  for (let i = 1; i < blocks.length; i++) {
    if (!blocks[i].isValid(blocks[i - 1])) {
      return {
        valid: false,
        tamperedBlock: blocks[i].blockNumber,
        message: `Block ${blocks[i].blockNumber} has been tampered with`
      };
    }
  }
  
  return {
    valid: true,
    totalBlocks: blocks.length,
    message: 'Blockchain is intact and verified'
  };
};

module.exports = mongoose.model('BlockchainRecord', blockchainSchema);
