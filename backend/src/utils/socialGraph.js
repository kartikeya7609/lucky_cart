import { Follow, User } from '../models/index.js';

/**
 * Perform a Breadth-First Search (BFS) to find the shortest path from startUser to targetUser.
 * This represents the degrees of connection (e.g. 1st degree, 2nd degree) based on accepted follows.
 * 
 * @param {string} startUserId - MongoDB ID of the source user
 * @param {string} targetUserId - MongoDB ID of the destination user
 * @returns {Promise<{ path: Array<object>, degree: number } | null>}
 */
export async function findConnectionPath(startUserId, targetUserId) {
  if (startUserId.toString() === targetUserId.toString()) {
    return { path: [], degree: 0 };
  }

  // Queue holds elements of shape: { userId: string, path: string[] }
  const queue = [{ userId: startUserId.toString(), path: [startUserId.toString()] }];
  const visited = new Set([startUserId.toString()]);

  while (queue.length > 0) {
    const { userId, path } = queue.shift();

    if (userId === targetUserId.toString()) {
      // Fetch details of all users in the path
      const users = await User.find({ _id: { $in: path } }).select('username full_name profile_pic');
      // Order them matching the path order
      const orderedPath = path.map(id => users.find(u => u._id.toString() === id)).filter(Boolean);
      return {
        path: orderedPath,
        degree: path.length - 1
      };
    }

    // Get all accepted follows (outgoing edges)
    const follows = await Follow.find({
      follower: userId,
      status: 'accepted'
    });

    for (const f of follows) {
      const neighborId = f.following.toString();
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({
          userId: neighborId,
          path: [...path, neighborId]
        });
      }
    }
  }

  return null;
}

/**
 * Get friend recommendations based on mutual connections (Friends of Friends).
 * It uses the BFS level-2 neighbors (neighbors of neighbors) and ranks them by the number of mutual friends.
 * 
 * @param {string} userId - MongoDB ID of the target user
 * @param {number} limit - Maximum number of recommendations
 * @returns {Promise<Array<object>>}
 */
export async function getFriendRecommendations(userId, limit = 5) {
  const userStr = userId.toString();

  // 1. Get everyone the user is currently following or has a pending request to
  const existingFollows = await Follow.find({ follower: userId });
  const excludedUserIds = new Set(existingFollows.map(f => f.following.toString()));
  excludedUserIds.add(userStr); // Do not recommend oneself

  // 2. Get all accepted followings of this user (direct friends / Level 1 neighbors)
  const myFollowingRelations = await Follow.find({ follower: userId, status: 'accepted' });
  const myFollowingIds = myFollowingRelations.map(f => f.following.toString());

  if (myFollowingIds.length === 0) {
    // If they aren't following anyone yet, recommend active public users on the platform
    const recommendations = await User.find({ 
      _id: { $nin: Array.from(excludedUserIds) } 
    })
    .select('username full_name profile_pic is_private')
    .limit(limit);

    return recommendations.map(u => ({
      user: u,
      mutualCount: 0,
      mutualFriends: []
    }));
  }

  // 3. For each direct friend, find who they are following (Level 2 neighbors)
  const fofRelations = await Follow.find({
    follower: { $in: myFollowingIds },
    status: 'accepted'
  });

  // Map to count mutual connections: CandidateId -> Set of MutualFriendIds
  const candidateMutuals = {};

  for (const rel of fofRelations) {
    const friendId = rel.follower.toString();
    const candidateId = rel.following.toString();

    // Skip if already followed or is the user themselves
    if (excludedUserIds.has(candidateId)) continue;

    if (!candidateMutuals[candidateId]) {
      candidateMutuals[candidateId] = new Set();
    }
    candidateMutuals[candidateId].add(friendId);
  }

  // 4. Sort candidates by mutual count and fetch user info
  const sortedCandidates = Object.entries(candidateMutuals)
    .map(([candidateId, mutualSet]) => ({
      candidateId,
      mutualFriends: Array.from(mutualSet),
      mutualCount: mutualSet.size
    }))
    .sort((a, b) => b.mutualCount - a.mutualCount)
    .slice(0, limit);

  if (sortedCandidates.length === 0) {
    // Fallback: recommend popular users
    const recommendations = await User.find({ 
      _id: { $nin: Array.from(excludedUserIds) } 
    })
    .select('username full_name profile_pic is_private')
    .limit(limit);

    return recommendations.map(u => ({
      user: u,
      mutualCount: 0,
      mutualFriends: []
    }));
  }

  // Fetch candidate details
  const candidateIds = sortedCandidates.map(c => c.candidateId);
  const candidateUsers = await User.find({ _id: { $in: candidateIds } }).select('username full_name profile_pic is_private');

  // Fetch mutual friend details
  const allMutualFriendIds = Array.from(new Set(sortedCandidates.flatMap(c => c.mutualFriends)));
  const mutualUsers = await User.find({ _id: { $in: allMutualFriendIds } }).select('username full_name');

  const results = sortedCandidates.map(c => {
    const user = candidateUsers.find(u => u._id.toString() === c.candidateId);
    const friends = c.mutualFriends.map(fid => mutualUsers.find(u => u._id.toString() === fid)).filter(Boolean);
    return {
      user,
      mutualCount: c.mutualCount,
      mutualFriends: friends
    };
  }).filter(r => r.user);

  return results;
}

/**
 * Computes PageRank influence scores for all users iteratively.
 * Should be run periodically (or on demand) to update User.influence_score.
 * 
 * @param {number} iterations - Number of iterations for the power method
 * @param {number} dampingFactor - Damping factor (typically 0.85)
 */
export async function computePageRank(iterations = 10, dampingFactor = 0.85) {
  const users = await User.find({}).select('_id');
  const userIds = users.map(u => u._id.toString());
  const N = userIds.length;
  if (N === 0) return;

  let pageRank = {};
  userIds.forEach(id => {
    pageRank[id] = 1 / N;
  });

  // Load adjacency lists
  const outgoingLinks = {};
  const incomingLinks = {};
  userIds.forEach(id => {
    outgoingLinks[id] = [];
    incomingLinks[id] = [];
  });

  const follows = await Follow.find({ status: 'accepted' });
  follows.forEach(f => {
    const src = f.follower.toString();
    const dest = f.following.toString();
    if (outgoingLinks[src] && incomingLinks[dest]) {
      outgoingLinks[src].push(dest);
      incomingLinks[dest].push(src);
    }
  });

  for (let iter = 0; iter < iterations; iter++) {
    const nextPageRank = {};
    let danglingWeight = 0;

    userIds.forEach(id => {
      if (outgoingLinks[id].length === 0) {
        danglingWeight += pageRank[id];
      }
    });

    userIds.forEach(id => {
      let sum = 0;
      const inbound = incomingLinks[id];
      inbound.forEach(src => {
        sum += pageRank[src] / outgoingLinks[src].length;
      });

      nextPageRank[id] = ((1 - dampingFactor) / N) +
                         (dampingFactor * (sum + (danglingWeight / N)));
    });

    pageRank = nextPageRank;
  }

  // Normalize scores out of 100
  const maxPR = Math.max(...Object.values(pageRank), 0.0001);
  for (const id of userIds) {
    const score = Math.min(100, Math.round((pageRank[id] / maxPR) * 100));
    await User.findByIdAndUpdate(id, { influence_score: score });
  }
}

/**
 * Recommends products popular among a user's network.
 * Analyzes items wishlisted, purchased, or shared by first and second-degree connections.
 * 
 * @param {string} userId - MongoDB ID of the user
 * @param {number} limit - Maximum number of recommendations
 * @returns {Promise<Array<object>>}
 */
export async function getNetworkProductRecommendations(userId, limit = 6) {
  // 1. Get 1st degree follows
  const follows = await Follow.find({ follower: userId, status: 'accepted' });
  const followingIds = follows.map(f => f.following);

  if (followingIds.length === 0) {
    return []; // No network connections yet
  }

  // 2. Fetch interactions by followed users
  const { ProductInteraction } = await import('./../models/index.js');
  const interactions = await ProductInteraction.find({
    user: { $in: followingIds }
  }).populate('product');

  const productScores = {};
  interactions.forEach(inter => {
    if (!inter.product) return;
    const prodId = inter.product._id.toString();
    
    // Assign weight based on action type
    let weight = 1;
    if (inter.interaction_type === 'PURCHASED') weight = 5;
    else if (inter.interaction_type === 'SHARED') weight = 4;
    else if (inter.interaction_type === 'WISHLISTED') weight = 3;
    else if (inter.interaction_type === 'LIKED') weight = 2;

    if (!productScores[prodId]) {
      productScores[prodId] = { product: inter.product, score: 0 };
    }
    productScores[prodId].score += weight;
  });

  return Object.values(productScores)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(e => e.product);
}

/**
 * Recommends shopping groups to a user based on mutual members and interest overlap.
 * 
 * @param {string} userId - MongoDB ID of the user
 * @param {number} limit - Maximum number of recommendations
 * @returns {Promise<Array<object>>}
 */
export async function getGroupRecommendations(userId, limit = 4) {
  const { Group } = await import('./../models/index.js');
  const user = await User.findById(userId).select('interests');
  if (!user) return [];

  // Get user's current groups
  const myGroups = await Group.find({ members: userId }).select('_id');
  const myGroupIds = new Set(myGroups.map(g => g._id.toString()));

  // Get all other groups
  const allOtherGroups = await Group.find({ _id: { $nin: Array.from(myGroupIds) } }).populate('members', 'interests');

  const groupScores = [];
  for (const group of allOtherGroups) {
    let score = 0;
    
    // 1. Score by category interest matching (interests list on members vs. user interests)
    const groupMemberInterests = new Set();
    group.members.forEach(member => {
      (member.interests || []).forEach(interest => groupMemberInterests.add(interest));
    });
    
    const overlapInterests = (user.interests || []).filter(i => groupMemberInterests.has(i));
    score += overlapInterests.length * 3;

    // 2. Score by mutual members who are in current user's following list
    const follows = await Follow.find({ follower: userId, status: 'accepted' });
    const followingIds = new Set(follows.map(f => f.following.toString()));
    const mutualMembers = group.members.filter(m => followingIds.has(m._id.toString()));
    score += mutualMembers.length * 5;

    groupScores.push({ group, score });
  }

  return groupScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(e => e.group);
}

