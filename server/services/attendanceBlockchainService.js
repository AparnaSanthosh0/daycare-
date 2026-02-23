const crypto = require('crypto');
const BlockchainRecord = require('../models/BlockchainRecord');

/**
 * Attendance Blockchain Service
 * 
 * Provides immutable, tamper-proof attendance records with:
 * - GPS location verification
 * - Photo hash verification
 * - Cryptographic timestamp proof
 * - Cannot be altered or deleted
 */

class AttendanceBlockchainService {
  /**
   * Create cryptographic hash of photo buffer
   * @param {Buffer} photoBuffer - Photo file buffer
   * @returns {string} SHA-256 hash of photo
   */
  static hashPhoto(photoBuffer) {
    return crypto.createHash('sha256').update(photoBuffer).digest('hex');
  }

  /**
   * Verify photo matches its stored hash
   * @param {Buffer} photoBuffer - Photo to verify
   * @param {string} storedHash - Previously stored hash
   * @returns {boolean} True if photo is authentic
   */
  static verifyPhoto(photoBuffer, storedHash) {
    const currentHash = this.hashPhoto(photoBuffer);
    return currentHash === storedHash;
  }

  /**
   * Record attendance action to blockchain (check-in or check-out)
   * @param {Object} params - Attendance parameters
   * @returns {Promise<Object>} Blockchain record
   */
  static async recordAttendance({
    entityType,
    entityId,
    entityName,
    actionType,
    actionTime,
    gpsLocation,
    photoBuffer,
    photoUrl,
    deviceInfo,
    performedBy,
    notes
  }) {
    try {
      // Get last block for chain linking
      const lastBlock = await BlockchainRecord.findOne().sort({ blockNumber: -1 });
      const nextBlockNumber = await BlockchainRecord.getNextBlockNumber();

      // Hash photo if provided
      let photoHash = null;
      let photoTimestamp = null;
      if (photoBuffer) {
        photoHash = this.hashPhoto(photoBuffer);
        photoTimestamp = new Date();
      }

      // Create immutable blockchain record
      const blockData = {
        blockNumber: nextBlockNumber,
        dataType: 'attendance',
        data: {
          entityType,
          entityId,
          entityName,
          actionType,
          actionTime: actionTime || new Date(),
          notes,
          
          // GPS proof (tamper-evident)
          gpsLocation: gpsLocation ? {
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude,
            accuracy: gpsLocation.accuracy,
            timestamp: gpsLocation.timestamp || new Date(),
            address: gpsLocation.address
          } : null,
          
          // Photo verification (cryptographic hash)
          photoHash,
          photoUrl,
          photoTimestamp,
          
          // Device audit trail
          deviceInfo: deviceInfo ? {
            userAgent: deviceInfo.userAgent,
            ipAddress: deviceInfo.ipAddress,
            deviceId: deviceInfo.deviceId
          } : null
        },
        previousHash: lastBlock ? lastBlock.hash : '0',
        createdBy: performedBy
      };

      const newBlock = new BlockchainRecord(blockData);
      await newBlock.save(); // Hash auto-calculated by pre-save hook

      return {
        success: true,
        blockNumber: newBlock.blockNumber,
        hash: newBlock.hash,
        record: newBlock
      };
    } catch (error) {
      console.error('Error recording attendance to blockchain:', error);
      throw error;
    }
  }

  /**
   * Get attendance history from blockchain for an entity
   * @param {string} entityType - 'child' or 'staff'
   * @param {string} entityId - Entity ID
   * @param {Object} filters - Optional filters (startDate, endDate, actionType)
   * @returns {Promise<Array>} Attendance records
   */
  static async getAttendanceHistory(entityType, entityId, filters = {}) {
    try {
      const query = {
        dataType: 'attendance',
        'data.entityType': entityType,
        'data.entityId': entityId
      };

      // Apply filters
      if (filters.startDate || filters.endDate) {
        query['data.actionTime'] = {};
        if (filters.startDate) {
          query['data.actionTime'].$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query['data.actionTime'].$lte = new Date(filters.endDate);
        }
      }

      if (filters.actionType) {
        query['data.actionType'] = filters.actionType;
      }

      const records = await BlockchainRecord.find(query)
        .sort({ blockNumber: 1 })
        .populate('createdBy', 'name email role');

      return records.map(r => ({
        id: r._id,
        blockNumber: r.blockNumber,
        hash: r.hash,
        actionType: r.data.actionType,
        actionTime: r.data.actionTime,
        gpsLocation: r.data.gpsLocation,
        photoHash: r.data.photoHash,
        photoUrl: r.data.photoUrl,
        photoTimestamp: r.data.photoTimestamp,
        deviceInfo: r.data.deviceInfo,
        notes: r.data.notes,
        timestamp: r.timestamp,
        performedBy: r.createdBy,
        verified: r.verified
      }));
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      throw error;
    }
  }

  /**
   * Verify integrity of attendance blockchain
   * @returns {Promise<Object>} Verification result
   */
  static async verifyChainIntegrity() {
    try {
      const result = await BlockchainRecord.verifyChain();
      return result;
    } catch (error) {
      console.error('Error verifying blockchain:', error);
      throw error;
    }
  }

  /**
   * Detect potential tampering attempts
   * @param {string} blockId - Block ID to check
   * @returns {Promise<Object>} Tampering detection result
   */
  static async detectTampering(blockId) {
    try {
      const block = await BlockchainRecord.findById(blockId);
      if (!block) {
        return { tampered: false, message: 'Block not found' };
      }

      // Recalculate hash
      const blockData = JSON.stringify({
        blockNumber: block.blockNumber,
        timestamp: block.timestamp,
        dataType: block.dataType,
        data: block.data,
        previousHash: block.previousHash
      });
      
      const calculatedHash = crypto.createHash('sha256').update(blockData).digest('hex');
      
      if (calculatedHash !== block.hash) {
        return {
          tampered: true,
          message: 'Block has been tampered with',
          storedHash: block.hash,
          calculatedHash
        };
      }

      // Check chain link
      const previousBlock = await BlockchainRecord.findOne({
        blockNumber: block.blockNumber - 1
      });

      if (previousBlock && block.previousHash !== previousBlock.hash) {
        return {
          tampered: true,
          message: 'Chain link broken',
          expectedPreviousHash: previousBlock.hash,
          actualPreviousHash: block.previousHash
        };
      }

      return { tampered: false, message: 'Block is valid and untampered' };
    } catch (error) {
      console.error('Error detecting tampering:', error);
      throw error;
    }
  }

  /**
   * Get attendance statistics from blockchain
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Statistics
   */
  static async getAttendanceStats(filters = {}) {
    try {
      const query = { dataType: 'attendance' };
      
      if (filters.entityType) {
        query['data.entityType'] = filters.entityType;
      }
      
      if (filters.startDate || filters.endDate) {
        query['data.actionTime'] = {};
        if (filters.startDate) {
          query['data.actionTime'].$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query['data.actionTime'].$lte = new Date(filters.endDate);
        }
      }

      const records = await BlockchainRecord.find(query);
      
      const stats = {
        totalRecords: records.length,
        checkIns: records.filter(r => r.data.actionType === 'check-in').length,
        checkOuts: records.filter(r => r.data.actionType === 'check-out').length,
        withGPS: records.filter(r => r.data.gpsLocation).length,
        withPhoto: records.filter(r => r.data.photoHash).length,
        verified: records.filter(r => r.verified).length,
        byEntityType: {
          child: records.filter(r => r.data.entityType === 'child').length,
          staff: records.filter(r => r.data.entityType === 'staff').length
        }
      };

      return stats;
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      throw error;
    }
  }
}

module.exports = AttendanceBlockchainService;
