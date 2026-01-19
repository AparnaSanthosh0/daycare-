/**
 * Auto-Assignment Utility for Delivery Agents
 * Implements smart assignment algorithm with zone-based scoring
 */

const User = require('../models/User');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const PlatformSettings = require('../models/PlatformSettings');

/**
 * Determine delivery zone based on address
 */
function determineZone(address, zones) {
  if (!address || !address.zipCode) {
    return 'General';
  }

  for (const zone of zones) {
    if (zone.zipCodes.includes(address.zipCode)) {
      return zone.name;
    }
  }

  return 'General';
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(loc1, loc2) {
  if (!loc1 || !loc2 || !loc1.lat || !loc1.lng || !loc2.lat || !loc2.lng) {
    return 0;
  }

  const R = 6371; // Earth radius in km
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLon = toRad(loc2.lng - loc1.lng);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Main auto-assignment function
 * Returns assigned agent or null if no agent available
 */
async function autoAssignDeliveryAgent(deliveryAssignment) {
  try {
    // Load platform settings
    const settings = await PlatformSettings.getSettings();

    // If auto-assignment is disabled, return null
    if (!settings.autoAssignment.enabled) {
      console.log('Auto-assignment is disabled. Use manual assignment.');
      return null;
    }

    // STEP 1: Determine zones
    const pickupZone = determineZone(
      deliveryAssignment.pickupLocation,
      settings.zones
    );
    const deliveryZone = determineZone(
      deliveryAssignment.deliveryLocation,
      settings.zones
    );

    deliveryAssignment.pickupLocation.zone = pickupZone;
    deliveryAssignment.deliveryLocation.zone = deliveryZone;
    await deliveryAssignment.save();

    console.log(`📍 Zones determined: Pickup=${pickupZone}, Delivery=${deliveryZone}`);

    // STEP 2: Find available agents in zones
    const availableAgents = await User.find({
      role: 'staff',
      'staff.staffType': 'delivery',
      'staff.deliveryArea': { $in: [pickupZone, deliveryZone] },
      'staff.availability': { $in: ['available', 'busy'] },
      isActive: true
    });

    if (availableAgents.length === 0) {
      console.log(`⚠️ No agents available in zones: ${pickupZone}, ${deliveryZone}`);
      await handleNoAgentsAvailable(deliveryAssignment);
      return null;
    }

    console.log(`✓ Found ${availableAgents.length} potential agents`);

    // STEP 3: Score each agent
    const weights = settings.autoAssignment.weights;
    const scoredAgents = await Promise.all(
      availableAgents.map(async (agent) => {
        // Factor 1: Current workload
        const activeDeliveries = await DeliveryAssignment.countDocuments({
          deliveryAgent: agent._id,
          status: { $in: ['assigned', 'accepted', 'picked_up', 'in_transit'] }
        });

        // Check if agent can take more
        if (activeDeliveries >= (agent.staff.maxConcurrentDeliveries || 3)) {
          return null; // Agent at capacity
        }

        const workloadScore = activeDeliveries * 10 * (weights.workload / 100);

        // Factor 2: Distance from pickup
        const agentLocation = agent.staff.currentLocation?.coordinates ||
          agent.staff.baseLocation?.coordinates ||
          { lat: 0, lng: 0 };

        const distance = calculateDistance(
          deliveryAssignment.pickupLocation.coordinates,
          agentLocation
        );
        const distanceScore = distance * 2 * (weights.distance / 100);

        // Factor 3: Agent rating
        const rating = agent.staff.rating || 4.0;
        const ratingScore = (5 - rating) * 4 * (weights.rating / 100);

        // Factor 4: Success rate
        const successRate = agent.staff.deliverySuccessRate || 90;
        const successScore = ((100 - successRate) / 10) * (weights.successRate / 100);

        // Calculate total score (LOWER is BETTER)
        const totalScore = workloadScore + distanceScore + ratingScore + successScore;

        return {
          agent,
          score: totalScore,
          breakdown: {
            activeDeliveries,
            distance: distance.toFixed(2),
            rating,
            successRate,
            workloadScore: workloadScore.toFixed(2),
            distanceScore: distanceScore.toFixed(2),
            ratingScore: ratingScore.toFixed(2),
            successScore: successScore.toFixed(2)
          }
        };
      })
    );

    // Filter out nulls (agents at capacity)
    const validAgents = scoredAgents.filter(a => a !== null);

    if (validAgents.length === 0) {
      console.log('⚠️ All agents are at capacity');
      await handleNoAgentsAvailable(deliveryAssignment);
      return null;
    }

    // STEP 4: Sort by score (lowest/best first)
    validAgents.sort((a, b) => a.score - b.score);

    // STEP 5: Assign to best agent
    const bestAgent = validAgents[0];

    deliveryAssignment.deliveryAgent = bestAgent.agent._id;
    deliveryAssignment.status = 'assigned';
    deliveryAssignment.assignedAt = new Date();
    deliveryAssignment.assignmentScore = bestAgent.score;
    deliveryAssignment.assignmentReason = `Zone: ${pickupZone}, Load: ${bestAgent.breakdown.activeDeliveries}, Distance: ${bestAgent.breakdown.distance}km, Rating: ${bestAgent.breakdown.rating}`;
    deliveryAssignment.responseDeadline = new Date(Date.now() + settings.autoAssignment.assignmentTimeout * 1000);

    await deliveryAssignment.save();

    // STEP 6: Update agent status
    await User.findByIdAndUpdate(bestAgent.agent._id, {
      $inc: { 'staff.currentDeliveries': 1 }
    });

    console.log(`✅ Auto-assigned to ${bestAgent.agent.firstName} ${bestAgent.agent.lastName} (Score: ${bestAgent.score.toFixed(2)})`);

    return bestAgent.agent;

  } catch (error) {
    console.error('Auto-assignment error:', error);
    return null;
  }
}

/**
 * Handle scenario when no agents are available
 */
async function handleNoAgentsAvailable(assignment) {
  assignment.status = 'pending';
  assignment.assignmentAttempts = (assignment.assignmentAttempts || 0) + 1;
  await assignment.save();

  console.log(`📧 Admin notification needed for assignment ${assignment._id}`);

  // TODO: Send notification to admin
  // await notifyAdmin({
  //   type: 'no_agents_available',
  //   assignment: assignment._id,
  //   zone: assignment.deliveryLocation.zone
  // });
}

/**
 * Handle agent rejection - reassign to next best agent
 */
async function handleAgentRejection(assignmentId, rejectionReason) {
  try {
    const assignment = await DeliveryAssignment.findById(assignmentId);
    const settings = await PlatformSettings.getSettings();

    // Update status
    assignment.agentResponse = 'rejected';
    assignment.rejectionReason = rejectionReason;
    assignment.assignmentAttempts = (assignment.assignmentAttempts || 0) + 1;

    // Release previous agent
    if (assignment.deliveryAgent) {
      await User.findByIdAndUpdate(assignment.deliveryAgent, {
        $inc: { 'staff.currentDeliveries': -1 }
      });
    }

    // Reset for reassignment
    assignment.deliveryAgent = null;
    assignment.status = 'pending';
    await assignment.save();

    // Check attempt limit
    if (assignment.assignmentAttempts >= settings.autoAssignment.reassignmentAttempts) {
      console.log(`⚠️ Max reassignment attempts reached for assignment ${assignmentId}`);
      await handleNoAgentsAvailable(assignment);
      return;
    }

    // Try next best agent
    console.log(`🔄 Reassigning delivery (Attempt ${assignment.assignmentAttempts})`);
    await autoAssignDeliveryAgent(assignment);

  } catch (error) {
    console.error('Handle rejection error:', error);
  }
}

/**
 * Get suggested agents for manual assignment
 * Returns top 3 best agents sorted by score
 */
async function getSuggestedAgents(deliveryAssignment) {
  try {
    const settings = await PlatformSettings.getSettings();

    // Determine zones
    const pickupZone = determineZone(
      deliveryAssignment.pickupLocation,
      settings.zones
    );
    const deliveryZone = determineZone(
      deliveryAssignment.deliveryLocation,
      settings.zones
    );

    // Find available agents
    const availableAgents = await User.find({
      role: 'staff',
      'staff.staffType': 'delivery',
      'staff.deliveryArea': { $in: [pickupZone, deliveryZone] },
      'staff.availability': { $in: ['available', 'busy'] },
      isActive: true
    }).limit(10);

    if (availableAgents.length === 0) {
      return [];
    }

    // Score each agent
    const scoredAgents = await Promise.all(
      availableAgents.map(async (agent) => {
        const activeDeliveries = await DeliveryAssignment.countDocuments({
          deliveryAgent: agent._id,
          status: { $in: ['assigned', 'accepted', 'picked_up', 'in_transit'] }
        });

        // Check capacity
        if (activeDeliveries >= (agent.staff.maxConcurrentDeliveries || 3)) {
          return null;
        }

        const agentLocation = agent.staff.currentLocation?.coordinates ||
          agent.staff.baseLocation?.coordinates ||
          { lat: 0, lng: 0 };

        const distance = calculateDistance(
          deliveryAssignment.pickupLocation.coordinates,
          agentLocation
        );

        // Simple score for suggestions
        const score = (activeDeliveries * 10) + distance;

        return {
          _id: agent._id,
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email,
          phone: agent.phone,
          rating: agent.staff.rating || 4.5,
          activeDeliveries,
          distance: distance.toFixed(2),
          score: score.toFixed(2),
          availability: agent.staff.availability
        };
      })
    );

    // Filter and sort
    const validAgents = scoredAgents.filter(a => a !== null);
    validAgents.sort((a, b) => parseFloat(a.score) - parseFloat(b.score));

    return validAgents.slice(0, 3); // Top 3 suggestions

  } catch (error) {
    console.error('Get suggested agents error:', error);
    return [];
  }
}

module.exports = {
  autoAssignDeliveryAgent,
  handleAgentRejection,
  getSuggestedAgents,
  determineZone,
  calculateDistance
};
