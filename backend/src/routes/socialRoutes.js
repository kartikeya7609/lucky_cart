import express from 'express';
import {
  getStreamToken,
  followUser,
  unfollowUser,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  searchUsers,
  getUserProfile,
  getConnections,
  getRecommendations,
  togglePrivacy,
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupDetails,
  shareProductToGroup,
  getNetworkProductRecommendationsEndpoint,
  getGroupRecommendationsEndpoint,
  getInfluencePageRankEndpoint,
  getChatMessages,
  getGroupChatMessages,
  getChatConversations,
  getFollowers,
  getFollowing,
  getJoinedGroups
} from '../controllers/socialController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/stream-token', protect, getStreamToken);
router.post('/follow/:userId', protect, followUser);
router.delete('/unfollow/:userId', protect, unfollowUser);
router.get('/requests', protect, getFollowRequests);
router.post('/requests/:requestId/accept', protect, acceptFollowRequest);
router.delete('/requests/:requestId/reject', protect, rejectFollowRequest);
router.get('/search', protect, searchUsers);
router.get('/profile/:userId', protect, getUserProfile);
router.get('/connections/:userId', protect, getConnections);
router.get('/followers', protect, getFollowers);
router.get('/following', protect, getFollowing);
router.get('/recommendations', protect, getRecommendations);
router.put('/privacy', protect, togglePrivacy);

// Group management routes
router.post('/groups', protect, createGroup);
router.get('/groups/joined', protect, getJoinedGroups);
router.post('/groups/:groupId/join', protect, joinGroup);
router.post('/groups/:groupId/leave', protect, leaveGroup);
router.get('/groups/:groupId', protect, getGroupDetails);
router.post('/groups/:groupId/share-product', protect, shareProductToGroup);

// Recommendations & Graph routes
router.get('/recommendations/products', protect, getNetworkProductRecommendationsEndpoint);
router.get('/recommendations/groups', protect, getGroupRecommendationsEndpoint);
router.get('/influence', protect, getInfluencePageRankEndpoint);

// Chat logs retrieval routes
router.get('/chat/conversations', protect, getChatConversations);
router.get('/chat/messages/:userId', protect, getChatMessages);
router.get('/chat/group-messages/:groupId', protect, getGroupChatMessages);

export default router;
