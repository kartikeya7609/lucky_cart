import { User, Follow, Wishlist } from '../models/index.js';
import { findConnectionPath, getFriendRecommendations } from '../utils/socialGraph.js';
import { StreamChat } from 'stream-chat';

// Generate Stream Chat token and upsert user profile
export const getStreamToken = async (req, res) => {
  try {
    const user = req.user;
    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;

    if (!apiKey || !apiSecret || apiKey.startsWith('your_') || apiSecret.startsWith('your_')) {
      // Mock mode for local testing if stream credentials are not provided
      return res.status(200).json({
        token: 'mock_token',
        apiKey: 'mock_key',
        user: {
          id: user._id.toString(),
          name: user.full_name,
          username: user.username,
          image: user.profile_pic || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
        }
      });
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret);
    const token = serverClient.createToken(user._id.toString());

    await serverClient.upsertUser({
      id: user._id.toString(),
      name: user.full_name,
      username: user.username,
      image: user.profile_pic || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
    });

    res.status(200).json({
      token,
      apiKey,
      user: {
        id: user._id.toString(),
        name: user.full_name,
        username: user.username,
        image: user.profile_pic || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Follow a user
export const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if follow relation already exists
    const existingFollow = await Follow.findOne({
      follower: currentUserId,
      following: targetUserId
    });

    if (existingFollow) {
      return res.status(400).json({
        message: existingFollow.status === 'pending'
          ? 'Follow request already sent and is pending.'
          : 'You are already following this user.'
      });
    }

    // Determine status: if target is private, status is pending, else accepted
    const status = targetUser.is_private ? 'pending' : 'accepted';

    const follow = await Follow.create({
      follower: currentUserId,
      following: targetUserId,
      status
    });

    res.status(201).json({
      message: status === 'pending' ? 'Follow request sent.' : 'Successfully followed user.',
      follow
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Unfollow a user
export const unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const follow = await Follow.findOneAndDelete({
      follower: currentUserId,
      following: targetUserId
    });

    if (!follow) {
      return res.status(400).json({ message: 'You are not following this user.' });
    }

    res.status(200).json({ message: 'Successfully unfollowed user.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get pending follow requests
export const getFollowRequests = async (req, res) => {
  try {
    const requests = await Follow.find({
      following: req.user._id,
      status: 'pending'
    })
    .populate('follower', 'username full_name profile_pic')
    .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Accept follow request
export const acceptFollowRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;

    const request = await Follow.findOne({
      _id: requestId,
      following: req.user._id,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({ message: 'Follow request not found.' });
    }

    request.status = 'accepted';
    await request.save();

    res.status(200).json({ message: 'Follow request accepted.', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject / Delete follow request
export const rejectFollowRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;

    const request = await Follow.findOneAndDelete({
      _id: requestId,
      following: req.user._id,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({ message: 'Follow request not found.' });
    }

    res.status(200).json({ message: 'Follow request declined.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Search users and get relationship status
export const searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    const currentUserId = req.user._id;

    if (!query) {
      return res.status(200).json([]);
    }

    // Search users by name or username (excluding current user)
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { full_name: { $regex: query, $options: 'i' } }
      ]
    }).select('username full_name profile_pic is_private');

    // Get all follow relationships involving the current user to tag search results
    const followRelations = await Follow.find({
      $or: [
        { follower: currentUserId },
        { following: currentUserId }
      ]
    });

    const results = users.map(user => {
      const isFollowingRel = followRelations.find(r => r.follower.toString() === currentUserId.toString() && r.following.toString() === user._id.toString());
      const isFollowedByRel = followRelations.find(r => r.follower.toString() === user._id.toString() && r.following.toString() === currentUserId.toString());

      return {
        _id: user._id,
        username: user.username,
        full_name: user.full_name,
        profile_pic: user.profile_pic,
        is_private: user.is_private,
        followStatus: isFollowingRel ? isFollowingRel.status : 'none', // 'accepted', 'pending', or 'none'
        isFollower: isFollowedByRel ? (isFollowedByRel.status === 'accepted') : false
      };
    });

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get profile details (hides private info if not following)
export const getUserProfile = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isSelf = currentUserId.toString() === targetUserId.toString();

    // Check relationship
    const followRel = await Follow.findOne({
      follower: currentUserId,
      following: targetUserId
    });

    const isFollowerRel = await Follow.findOne({
      follower: targetUserId,
      following: currentUserId
    });

    const followStatus = followRel ? followRel.status : 'none';
    const isFollowing = followStatus === 'accepted';
    const isFollower = isFollowerRel ? isFollowerRel.status === 'accepted' : false;

    // Is profile viewable?
    const isViewable = isSelf || !targetUser.is_private || isFollowing;

    // Calculate connection path & degree
    const pathDetails = await findConnectionPath(currentUserId, targetUserId);

    // Follower / following counts (always public)
    const followerCount = await Follow.countDocuments({ following: targetUserId, status: 'accepted' });
    const followingCount = await Follow.countDocuments({ follower: targetUserId, status: 'accepted' });

    // Recent followers for avatar strip
    const recentFollowers = await Follow.find({ following: targetUserId, status: 'accepted' })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('follower', 'username full_name profile_pic');

    let profileData = {
      _id: targetUser._id,
      username: targetUser.username,
      full_name: targetUser.full_name,
      profile_pic: targetUser.profile_pic,
      is_private: targetUser.is_private,
      influence_score: targetUser.influence_score || 0,
      followStatus,
      isFollower,
      followerCount,
      followingCount,
      recentFollowers: recentFollowers.map(f => f.follower),
      connection: pathDetails
    };

    if (isViewable) {
      // Append contact info
      profileData.email_address = targetUser.email_address;
      profileData.city = targetUser.city;
      profileData.state = targetUser.state;
      profileData.role = targetUser.role;

      // Get public wishlist items
      const wishlist = await Wishlist.findOne({ user: targetUserId, is_public: true }).populate({
        path: 'items',
        populate: { path: 'item' }
      });
      profileData.wishlistItems = wishlist ? wishlist.items : [];
    }

    res.status(200).json({
      isViewable,
      profile: profileData
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get connections count (followers and following list)
export const getConnections = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check visibility
    const isSelf = currentUserId.toString() === targetUserId.toString();
    const followRel = await Follow.findOne({ follower: currentUserId, following: targetUserId, status: 'accepted' });
    if (!isSelf && user.is_private && !followRel) {
      return res.status(403).json({ message: 'This account is private.' });
    }

    const followers = await Follow.find({ following: targetUserId, status: 'accepted' })
      .populate('follower', 'username full_name profile_pic');

    const following = await Follow.find({ follower: targetUserId, status: 'accepted' })
      .populate('following', 'username full_name profile_pic');

    res.status(200).json({
      followers: followers.map(f => f.follower),
      following: following.map(f => f.following)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get followers list for logged-in user
export const getFollowers = async (req, res) => {
  try {
    const followers = await Follow.find({ following: req.user._id, status: 'accepted' })
      .populate('follower', 'username full_name profile_pic');
    res.status(200).json(followers.map(f => f.follower));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get following list for logged-in user
export const getFollowing = async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.user._id, status: 'accepted' })
      .populate('following', 'username full_name profile_pic');
    res.status(200).json(following.map(f => f.following));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Recommend friends to follow
export const getRecommendations = async (req, res) => {
  try {
    const recommendations = await getFriendRecommendations(req.user._id);
    res.status(200).json(recommendations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Toggle user profile privacy
export const togglePrivacy = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.is_private = !user.is_private;
    await user.save();

    res.status(200).json({
      message: `Account is now ${user.is_private ? 'Private' : 'Public'}.`,
      is_private: user.is_private
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new shopping group
export const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Group name is required.' });
    }

    const { Group } = await import('../models/index.js');
    const group = await Group.create({
      name,
      description,
      creator: req.user._id,
      members: [req.user._id]
    });

    res.status(201).json({ message: 'Group created successfully.', group });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Join a shopping group
export const joinGroup = async (req, res) => {
  try {
    const { Group } = await import('../models/index.js');
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are already a member of this group.' });
    }

    group.members.push(req.user._id);
    await group.save();

    res.status(200).json({ message: 'Joined group successfully.', group });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Leave a shopping group
export const leaveGroup = async (req, res) => {
  try {
    const { Group } = await import('../models/index.js');
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    group.members = group.members.filter(m => m.toString() !== req.user._id.toString());
    await group.save();

    res.status(200).json({ message: 'Left group successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fetch group details, members, and shared products
export const getGroupDetails = async (req, res) => {
  try {
    const { Group } = await import('../models/index.js');
    const group = await Group.findById(req.params.groupId)
      .populate('creator', 'username full_name profile_pic')
      .populate('members', 'username full_name profile_pic interests')
      .populate('shared_products.product', 'name price description user_file category stock')
      .populate('shared_products.sharedBy', 'username full_name');

    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    // Verify membership
    if (!group.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    res.status(200).json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Share product to group
export const shareProductToGroup = async (req, res) => {
  try {
    const { productId } = req.body;
    const { Group } = await import('../models/index.js');
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    // Check if product already shared
    const isShared = group.shared_products.some(p => p.product.toString() === productId);
    if (isShared) {
      return res.status(400).json({ message: 'Product already shared to this group.' });
    }

    group.shared_products.push({
      product: productId,
      sharedBy: req.user._id,
      sharedAt: new Date()
    });

    await group.save();
    res.status(200).json({ message: 'Product shared to group successfully.', group });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get network product recommendations (Collaborative filtering)
export const getNetworkProductRecommendationsEndpoint = async (req, res) => {
  try {
    const { getNetworkProductRecommendations } = await import('../utils/socialGraph.js');
    const products = await getNetworkProductRecommendations(req.user._id);
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get group recommendations
export const getGroupRecommendationsEndpoint = async (req, res) => {
  try {
    const { getGroupRecommendations } = await import('../utils/socialGraph.js');
    const groups = await getGroupRecommendations(req.user._id);
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get influence PageRank leaderboard
export const getInfluencePageRankEndpoint = async (req, res) => {
  try {
    const influencers = await User.find({ role: { $ne: 'admin' } })
      .select('username full_name profile_pic influence_score')
      .sort({ influence_score: -1 })
      .limit(10);
    res.status(200).json(influencers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fetch direct message logs with a specific user
export const getChatMessages = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;
    const { Message } = await import('../models/index.js');

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId }
      ]
    })
    .populate('sender', 'username full_name profile_pic')
    .populate('recipient', 'username full_name profile_pic')
    .populate('metadata.productId', 'name price user_file description')
    .populate('metadata.cartItems.product', 'name price user_file description')
    .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fetch group message logs
export const getGroupChatMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { Message, Group } = await import('../models/index.js');

    // Verify membership first
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username full_name profile_pic')
      .populate('metadata.productId', 'name price user_file description')
      .populate('metadata.cartItems.product', 'name price user_file description')
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fetch list of active direct message conversations
export const getChatConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { Message } = await import('../models/index.js');

    // Find all DMs involving current user
    const messages = await Message.find({
      $or: [{ sender: currentUserId }, { recipient: currentUserId }],
      group: null
    })
    .populate('sender', 'username full_name profile_pic')
    .populate('recipient', 'username full_name profile_pic')
    .sort({ createdAt: -1 });

    // Group by participant
    const conversationMap = new Map();
    messages.forEach(msg => {
      const otherUser = msg.sender._id.toString() === currentUserId.toString() ? msg.recipient : msg.sender;
      if (!otherUser) return;
      const otherUserId = otherUser._id.toString();

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          user: otherUser,
          lastMessage: msg
        });
      }
    });

    res.status(200).json(Array.from(conversationMap.values()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


