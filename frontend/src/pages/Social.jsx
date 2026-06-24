import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { api } from '../utils/api';
import { 
  Search, UserPlus, UserCheck, UserMinus, Clock, Globe, Lock, 
  MessageSquare, User as UserIcon, Shield, Sparkles, ArrowRight,
  ShoppingCart, Heart, Camera, Send, Check, X, ArrowLeft,
  Users, Share2, Plus, Info, ExternalLink, RefreshCw, Copy, TrendingUp, Award, Star
} from 'lucide-react';
import { io } from 'socket.io-client';
import { StreamChat } from 'stream-chat';
import { Chat, Channel, Window, ChannelHeader, MessageList, MessageComposer } from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';

const Social = () => {
  const { token, user, addToast } = useAuth();
  const { refreshCart } = useCart();

  // Socket reference
  const socketRef = useRef(null);

  // UI Panels state
  const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'wishlists', 'carts'
  const [activeChat, setActiveChat] = useState(null); // { id, name, type: 'dm' | 'group' }
  const [chatMessages, setChatMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineStatusMap, setOnlineStatusMap] = useState({});

  // Stream Chat states
  const [streamClient, setStreamClient] = useState(null);
  const [streamChannel, setStreamChannel] = useState(null);
  const [isStreamActive, setIsStreamActive] = useState(false);

  // Core Data state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendRecommendations, setFriendRecommendations] = useState([]);
  const [groupRecommendations, setGroupRecommendations] = useState([]);
  const [followRequests, setFollowRequests] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [influenceRankings, setInfluenceRankings] = useState([]);
  
  // Center feed contents
  const [sharedProducts, setSharedProducts] = useState([]);
  const [sharedWishlists, setSharedWishlists] = useState([]);
  const [sharedCarts, setSharedCarts] = useState([]);
  
  // Active user data
  const [currentUserData, setCurrentUserData] = useState(null);
  const [selectedUserPath, setSelectedUserPath] = useState(null);

  // Form states
  const [chatInput, setChatInput] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [recentChatsList, setRecentChatsList] = useState([]);

  // Profile panel state
  const [viewingProfile, setViewingProfile] = useState(null);   // fetched profile object
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Mobile navigation states
  const [mobileTab, setMobileTab] = useState('feed'); // 'feed' | 'network' | 'dashboard'
  const [mobileChatView, setMobileChatView] = useState('chat'); // 'chat' | 'list'

  const chatEndRef = useRef(null);

  // Initialize Socket and Load Data
  useEffect(() => {
    if (!token) return;

    // Connect Socket.io client to backend
    const backendUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:5000' 
      : window.location.origin;

    const socket = io(backendUrl, {
      auth: { token }
    });
    socketRef.current = socket;

    // Listeners
    socket.on('receive_dm', (msg) => {
      if (activeChat && activeChat.type === 'dm' && 
          (msg.sender._id === activeChat.id || msg.recipient._id === activeChat.id)) {
        setChatMessages(prev => [...prev, msg]);
      }
      fetchRecentConversations();
    });

    socket.on('receive_group_msg', (data) => {
      if (activeChat && activeChat.type === 'group' && data.groupId === activeChat.id) {
        setChatMessages(prev => [...prev, data.message]);
      }
    });

    socket.on('user_typing_start', (data) => {
      if (activeChat && activeChat.type === 'dm' && data.userId === activeChat.id) {
        setTypingUsers(prev => new Set([...prev, data.username]));
      } else if (activeChat && activeChat.type === 'group' && data.groupId === activeChat.id) {
        setTypingUsers(prev => new Set([...prev, data.username]));
      }
    });

    socket.on('user_typing_stop', (data) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(data.username);
        return next;
      });
    });

    socket.on('user_status_change', (data) => {
      setOnlineStatusMap(prev => ({
        ...prev,
        [data.userId]: data.status === 'online'
      }));
    });

    socket.on('online_status_response', (statusMap) => {
      setOnlineStatusMap(prev => ({ ...prev, ...statusMap }));
    });

    // Load initial data
    loadAllSocialData();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, activeChat]);

  // Clean up Stream Chat client on unmount or client change
  useEffect(() => {
    return () => {
      if (streamClient) {
        streamClient.disconnectUser().catch(err => console.error('Stream disconnect on unmount error:', err));
      }
    };
  }, [streamClient]);

  // Load backend data helper
  const loadAllSocialData = async () => {
    try {
      // Current user
      const me = await api.get('/auth/me', token);
      setCurrentUserData(me);

      // Recommendations & Leaderboards
      const friendRecs = await api.get('/social/recommendations', token);
      setFriendRecommendations(friendRecs);

      const groupRecs = await api.get('/social/recommendations/groups', token);
      setGroupRecommendations(groupRecs);

      const influencers = await api.get('/social/influence', token);
      setInfluenceRankings(influencers);

      // Follow lists
      const reqs = await api.get('/social/requests', token);
      setFollowRequests(reqs);

      const fers = await api.get('/social/followers', token);
      setFollowers(fers);

      const fing = await api.get('/social/following', token);
      setFollowing(fing);

      // Center Feed content
      const networkProducts = await api.get('/social/recommendations/products', token);
      setSharedProducts(networkProducts);

      // Fetch active conversations list
      fetchRecentConversations();
    } catch (err) {
      console.error('Error loading social data:', err);
    }
  };

  const fetchRecentConversations = async () => {
    try {
      const convs = await api.get('/social/chat/conversations', token);
      setRecentChatsList(convs);

      // Query online status for these users
      const userIds = convs.map(c => c.user._id);
      if (userIds.length > 0 && socketRef.current) {
        socketRef.current.emit('check_online_status', { userIds });
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  // BFS Shortest Connection Path
  const fetchConnectionPath = async (targetUserId) => {
    try {
      const pathData = await api.get(`/social/profile/${targetUserId}`, token);
      if (pathData?.profile?.connection) {
        setSelectedUserPath(pathData.profile.connection);
      }
    } catch (err) {
      console.error('Error fetching connection path:', err);
    }
  };

  // Search users handler
  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await api.get(`/social/search?q=${encodeURIComponent(q)}`, token);
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Follow a user
  const handleFollow = async (targetUser) => {
    try {
      const res = await api.post(`/social/follow/${targetUser._id}`, {}, token);
      addToast(res.message, 'success');
      loadAllSocialData();
    } catch (err) {
      addToast(err.message || 'Follow failed', 'danger');
    }
  };

  // Unfollow a user
  const handleUnfollow = async (targetUserId) => {
    try {
      const res = await api.delete(`/social/unfollow/${targetUserId}`, token);
      addToast(res.message, 'success');
      loadAllSocialData();
    } catch (err) {
      addToast(err.message || 'Unfollow failed', 'danger');
    }
  };

  // Accept Follow Request
  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await api.post(`/social/requests/${requestId}/accept`, {}, token);
      addToast(res.message, 'success');
      loadAllSocialData();
    } catch (err) {
      addToast(err.message || 'Accept failed', 'danger');
    }
  };

  // Decline Follow Request
  const handleRejectRequest = async (requestId) => {
    try {
      const res = await api.delete(`/social/requests/${requestId}/reject`, token);
      addToast(res.message, 'success');
      loadAllSocialData();
    } catch (err) {
      addToast(err.message || 'Reject failed', 'danger');
    }
  };

  // Group creation
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await api.post('/social/groups', {
        name: newGroupName,
        description: newGroupDesc
      }, token);
      addToast(res.message, 'success');
      setIsCreatingGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      loadAllSocialData();
    } catch (err) {
      addToast(err.message || 'Failed to create group', 'danger');
    }
  };

  // Join a shopping group
  const handleJoinGroup = async (groupId) => {
    try {
      const res = await api.post(`/social/groups/${groupId}/join`, {}, token);
      addToast(res.message, 'success');
      loadAllSocialData();
    } catch (err) {
      addToast(err.message || 'Failed to join group', 'danger');
    }
  };

  // Open Chat Room
  const selectChat = async (target, type) => {
    setMobileChatView('chat');
    setActiveChat({
      id: target._id,
      name: target.name || target.full_name,
      type,
      profile_pic: target.profile_pic || null
    });
    setChatMessages([]);
    
    // Disconnect previous Stream client if any
    if (streamClient) {
      try {
        await streamClient.disconnectUser();
      } catch (e) {
        console.error(e);
      }
      setStreamClient(null);
      setStreamChannel(null);
    }
    setIsStreamActive(false);

    try {
      const res = await api.get('/social/stream-token', token);
      if (res.token && res.token !== 'mock_token' && res.apiKey && res.apiKey !== 'mock_key' && !res.apiKey.startsWith('your_')) {
        const client = StreamChat.getInstance(res.apiKey);
        await client.connectUser(
          {
            id: res.user.id,
            name: res.user.name,
            image: res.user.image
          },
          res.token
        );

        let channel;
        if (type === 'dm') {
          const members = [res.user.id, target._id.toString()].sort();
          channel = client.channel('messaging', `chat-${members.join('-')}`, {
            name: target.full_name,
            members
          });
        } else {
          channel = client.channel('team', `group-${target._id.toString()}`, {
            name: target.name
          });
        }

        await channel.watch();
        setStreamClient(client);
        setStreamChannel(channel);
        setIsStreamActive(true);
        return;
      }
    } catch (err) {
      console.warn('Stream Chat SDK init failed, falling back to Socket.io:', err.message);
    }

    try {
      if (type === 'dm') {
        const history = await api.get(`/social/chat/messages/${target._id}`, token);
        setChatMessages(history);
      } else {
        const history = await api.get(`/social/chat/group-messages/${target._id}`, token);
        setChatMessages(history);
      }
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  // Send Message
  const handleSendMessage = (e, metadata = null) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && !metadata) return;

    if (socketRef.current && activeChat) {
      if (activeChat.type === 'dm') {
        socketRef.current.emit('send_dm', {
          recipientId: activeChat.id,
          content: chatInput || (metadata ? `Shared content` : ''),
          messageType: metadata ? metadata.type : 'TEXT',
          metadata: metadata ? metadata.payload : null
        });
      } else {
        socketRef.current.emit('send_group_msg', {
          groupId: activeChat.id,
          content: chatInput || (metadata ? `Shared content` : ''),
          messageType: metadata ? metadata.type : 'TEXT',
          metadata: metadata ? metadata.payload : null
        });
      }
      setChatInput('');
      socketRef.current.emit('typing_stop', { targetId: activeChat.id, isGroup: activeChat.type === 'group' });
    }
  };

  // Typing indicator trigger
  const handleTyping = (e) => {
    setChatInput(e.target.value);
    if (socketRef.current && activeChat) {
      socketRef.current.emit('typing_start', { targetId: activeChat.id, isGroup: activeChat.type === 'group' });
      
      // Stop typing timer
      clearTimeout(window.typingTimer);
      window.typingTimer = setTimeout(() => {
        socketRef.current.emit('typing_stop', { targetId: activeChat.id, isGroup: activeChat.type === 'group' });
      }, 2000);
    }
  };

  // Cart Cloning
  const handleCloneCart = async (cartItems) => {
    try {
      for (const item of cartItems) {
        await api.post(`/cart/add/${item.product._id}`, { quantity: item.quantity }, token);
      }
      addToast('Cart cloned successfully!', 'success');
      refreshCart();
    } catch (err) {
      addToast(err.message || 'Cart cloning failed', 'danger');
    }
  };

  // Wishlist Cloning
  const handleCloneWishlist = async (wishlistItems) => {
    try {
      for (const item of wishlistItems) {
        await api.post(`/wishlist/add/${item.item._id}`, {}, token);
      }
      addToast('Wishlist items added to your wishlist!', 'success');
    } catch (err) {
      addToast(err.message || 'Wishlist cloning failed', 'danger');
    }
  };

  // Toggle account privacy
  const handleTogglePrivacy = async () => {
    try {
      const res = await api.put('/social/privacy', {}, token);
      addToast(res.message, 'success');
      setCurrentUserData(prev => ({ ...prev, is_private: res.is_private }));
    } catch (err) {
      addToast('Failed to toggle privacy', 'danger');
    }
  };

  // Open profile panel by fetching data
  const openProfile = async (userId) => {
    if (!userId) return;
    setLoadingProfile(true);
    setViewingProfile(null);
    try {
      const data = await api.get(`/social/profile/${userId}`, token);
      setViewingProfile(data.profile);
    } catch (err) {
      addToast('Could not load profile', 'danger');
    } finally {
      setLoadingProfile(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserAvatarUrl = (userObj) => {
    if (!userObj) return 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
    if (typeof userObj === 'string') {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userObj)}`;
    }
    if (userObj.profile_pic) return userObj.profile_pic;
    const seed = encodeURIComponent(userObj.username || userObj.full_name || 'default');
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  };

  return (
    <div className="page">
      <style>{`
        .page { background: var(--color-background-tertiary); min-height: 100vh; padding: 0; }
        .hero { background: linear-gradient(135deg, #0d2818 0%, #0a1f14 60%, #112d1c 100%); padding: 28px 24px 24px; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, rgba(26,173,82,0.04) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(26,173,82,0.04) 0 1px, transparent 1px 40px); }
        .hero-inner { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
        .hero-label { font-size: 11px; letter-spacing: 0.08em; color: #4ecb80; font-weight: 500; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .hero-title { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px; line-height: 1.1; margin-bottom: 8px; }
        .hero-title span { color: #1aad52; }
        .hero-sub { font-size: 13px; color: rgba(255,255,255,0.55); max-width: 420px; line-height: 1.6; }
        .hero-user { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.07); border: 0.5px solid rgba(255,255,255,0.12); border-radius: var(--border-radius-lg); padding: 10px 14px; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; background: #1aad52; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: #fff; flex-shrink: 0; overflow: hidden; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .avatar.sm { width: 30px; height: 30px; font-size: 11px; }
        .avatar.xs { width: 24px; height: 24px; font-size: 10px; }
        .hero-user-name { font-size: 13px; font-weight: 500; color: #fff; }
        .hero-rank { font-size: 11px; color: #4ecb80; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
        .main { display: grid; grid-template-columns: 260px 1fr 240px; gap: 16px; padding: 16px; }
        @media (max-width: 1024px) {
          .main { grid-template-columns: 1fr; }
        }
        .col { display: flex; flex-direction: column; gap: 12px; }
        .card { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); overflow: hidden; }
        .card-head { padding: 12px 14px 10px; display: flex; align-items: center; justify-content: space-between; border-bottom: 0.5px solid var(--color-border-tertiary); }
        .card-title { font-size: 11px; font-weight: 500; letter-spacing: 0.07em; color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px; text-transform: uppercase; }
        .card-body { padding: 12px 14px; }
        .search-box { display: flex; align-items: center; gap: 8px; background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); padding: 8px 12px; }
        .search-box input { background: none; border: none; outline: none; font-size: 13px; color: var(--color-text-primary); width: 100%; font-family: var(--font-sans); }
        .search-box i { font-size: 15px; color: var(--color-text-tertiary); }
        .chat-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; cursor: pointer; border-radius: var(--border-radius-md); }
        .chat-item:hover { background: var(--color-background-secondary); margin: 0 -4px; padding-left: 4px; padding-right: 4px; }
        .chat-info { flex: 1; min-width: 0; }
        .chat-name { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
        .chat-preview { font-size: 12px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .online-dot { width: 8px; height: 8px; background: #1aad52; border-radius: 50%; border: 2px solid var(--color-background-primary); margin-top: -10px; margin-left: -8px; }
        .group-card { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); padding: 12px; background: var(--color-background-secondary); cursor: pointer; transition: border-color 0.15s; }
        .group-card:hover { border-color: #1aad52; }
        .group-name { font-size: 13px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 3px; }
        .group-desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; margin-bottom: 10px; }
        .btn-green { background: #1aad52; color: #fff; border: none; border-radius: var(--border-radius-md); padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; width: 100%; font-family: var(--font-sans); }
        .btn-green:hover { background: #158a42; }
        .tabs { display: flex; gap: 2px; padding: 10px 14px 0; border-bottom: 0.5px solid var(--color-border-tertiary); }
        .tab { padding: 7px 14px; font-size: 13px; font-weight: 500; border-radius: var(--border-radius-md) var(--border-radius-md) 0 0; cursor: pointer; color: var(--color-text-secondary); border: none; background: none; font-family: var(--font-sans); }
        .tab.active { background: #1aad52; color: #fff; }
        .tab:hover:not(.active) { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .product-grid { padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 640px) {
          .product-grid { grid-template-columns: 1fr; }
        }
        .product-card { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); overflow: hidden; background: var(--color-background-secondary); cursor: pointer; transition: border-color 0.15s; }
        .product-card:hover { border-color: #1aad52; }
        .product-img { width: 100%; aspect-ratio: 4/3; background: var(--color-background-tertiary); display: flex; align-items: center; justify-content: center; font-size: 40px; border-bottom: 0.5px solid var(--color-border-tertiary); }
        .product-body { padding: 10px 12px; }
        .product-cat { font-size: 10px; font-weight: 500; letter-spacing: 0.07em; text-transform: uppercase; color: var(--color-text-tertiary); margin-bottom: 4px; }
        .product-name { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; }
        .product-desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; margin-bottom: 10px; }
        .product-footer { display: flex; align-items: center; justify-content: space-between; }
        .product-price { font-size: 16px; font-weight: 700; color: #1aad52; }
        .add-btn { background: #1aad52; color: #fff; border: none; border-radius: var(--border-radius-md); padding: 6px 12px; font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 5px; font-family: var(--font-sans); }
        .add-btn:hover { background: #158a42; }
        .wishlist-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 0.5px solid var(--color-border-tertiary); }
        .wishlist-item:last-child { border-bottom: none; }
        .wishlist-emoji { width: 36px; height: 36px; background: var(--color-background-secondary); border-radius: var(--border-radius-md); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .wishlist-info { flex: 1; min-width: 0; }
        .wishlist-name { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
        .wishlist-owner { font-size: 11px; color: var(--color-text-tertiary); }
        .tag-green { background: #e6f7ee; color: #1aad52; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; }
        .influencer-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 0.5px solid var(--color-border-tertiary); }
        .influencer-row:last-child { border-bottom: none; }
        .rank-num { font-size: 12px; font-weight: 700; color: var(--color-text-tertiary); width: 18px; text-align: center; flex-shrink: 0; }
        .rank-num.gold { color: #d4a017; }
        .influencer-info { flex: 1; min-width: 0; }
        .influencer-name { font-size: 13px; font-weight: 500; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .influencer-handle { font-size: 11px; color: var(--color-text-tertiary); }
        .star-badge { background: #f0faf4; color: #1aad52; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; flex-shrink: 0; }
        .privacy-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
        .privacy-label { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
        .privacy-sub { font-size: 11px; color: var(--color-text-tertiary); margin-top: 2px; }
        .toggle { width: 38px; height: 22px; border-radius: 20px; position: relative; cursor: pointer; flex-shrink: 0; display: inline-block; transition: background-color 0.2s; }
        .toggle::after { content: ''; position: absolute; top: 3px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
        .toggle.checked { background: #1aad52; }
        .toggle.checked::after { transform: translateX(19px); }
        .toggle.unchecked { background: #444; }
        .toggle.unchecked::after { transform: translateX(3px); }
        .add-group-btn { background: none; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); padding: 4px 10px; font-size: 11px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; display: flex; align-items: center; gap: 4px; font-family: var(--font-sans); }
        .add-group-btn:hover { background: var(--color-background-secondary); }
        .section-head-btn { background: none; border: none; color: #1aad52; font-size: 11px; font-weight: 500; cursor: pointer; font-family: var(--font-sans); }
        /* Profile modal — Instagram-style */
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.94) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .profile-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); padding: 16px; }
        .profile-modal { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: 24px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 32px 80px rgba(0,0,0,0.7); animation: modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }
        .profile-modal::-webkit-scrollbar { width: 4px; }
        .profile-modal::-webkit-scrollbar-track { background: transparent; }
        .profile-modal::-webkit-scrollbar-thumb { background: var(--color-border-tertiary); border-radius: 4px; }
        .pm-cover { height: 100px; background: linear-gradient(135deg, #0a1f14 0%, #112d1c 40%, #1aad5230 100%); position: relative; flex-shrink: 0; }
        .pm-cover::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, rgba(26,173,82,0.06) 0 1px, transparent 1px 44px), repeating-linear-gradient(0deg, rgba(26,173,82,0.06) 0 1px, transparent 1px 44px); }
        .pm-close { position: absolute; top: 12px; right: 12px; z-index: 10; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; backdrop-filter: blur(4px); transition: background 0.15s; }
        .pm-close:hover { background: rgba(0,0,0,0.7); }
        .pm-body { padding: 0 20px 24px; }
        .pm-avatar-wrap { margin-top: -46px; margin-bottom: 14px; position: relative; display: inline-block; }
        .pm-avatar-ring { width: 92px; height: 92px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, #1aad52, #4ecb80, #006d32, #1aad52); position: relative; }
        .pm-avatar-inner { width: 100%; height: 100%; border-radius: 50%; border: 3px solid var(--color-background-primary); background: #1aad52; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #fff; overflow: hidden; }
        .pm-avatar-inner img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .pm-verified { position: absolute; bottom: 4px; right: 4px; width: 22px; height: 22px; background: #1aad52; border: 2px solid var(--color-background-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .pm-name { font-size: 19px; font-weight: 800; color: var(--color-text-primary); letter-spacing: -0.3px; margin-bottom: 3px; text-transform: uppercase; }
        .pm-handle { font-size: 13px; color: var(--color-text-tertiary); margin-bottom: 6px; }
        .pm-role-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
        .pm-location { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 16px; display: flex; align-items: center; gap: 4px; }
        .pm-stats { display: flex; border-top: 0.5px solid var(--color-border-tertiary); border-bottom: 0.5px solid var(--color-border-tertiary); margin-bottom: 16px; }
        .pm-stat { flex: 1; text-align: center; padding: 14px 0; }
        .pm-stat-num { font-size: 22px; font-weight: 800; color: var(--color-text-primary); line-height: 1; margin-bottom: 4px; }
        .pm-stat-num.green { color: #1aad52; }
        .pm-stat-lbl { font-size: 10px; font-weight: 500; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.07em; }
        .pm-divider { width: 0.5px; background: var(--color-border-tertiary); flex-shrink: 0; }
        .pm-section-label { font-size: 10px; font-weight: 700; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .pm-path-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 4px; }
        .pm-path-node { display: flex; align-items: center; gap: 5px; background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 500; color: var(--color-text-primary); }
        .pm-path-arrow { color: var(--color-text-tertiary); font-size: 13px; }
        .pm-degree { font-size: 11px; color: var(--color-text-tertiary); margin-top: 5px; }
        .pm-followers-strip { display: flex; margin-bottom: 16px; }
        .pm-follower-avatar { width: 30px; height: 30px; border-radius: 50%; background: #1aad52; border: 2px solid var(--color-background-primary); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; cursor: pointer; overflow: hidden; flex-shrink: 0; transition: transform 0.15s; }
        .pm-follower-avatar:hover { transform: scale(1.15); z-index: 10; }
        .pm-wl-chip { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--color-background-secondary); border-radius: 12px; border: 0.5px solid var(--color-border-tertiary); margin-bottom: 6px; }
        .pm-wl-emoji { font-size: 20px; flex-shrink: 0; }
        .pm-wl-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
        .pm-wl-price { font-size: 11px; color: #1aad52; margin-top: 2px; }
        .pm-actions { display: flex; gap: 8px; margin-top: 4px; }
        .pm-btn { border: none; border-radius: 12px; padding: 11px 20px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: var(--font-sans); display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
        .pm-btn-primary { background: #1aad52; color: #fff; flex: 1; }
        .pm-btn-primary:hover { background: #158a42; }
        .pm-btn-secondary { background: var(--color-background-secondary); color: var(--color-text-primary); border: 0.5px solid var(--color-border-tertiary); }
        .pm-btn-secondary:hover { background: var(--color-border-tertiary); }
        .pm-btn-danger { background: transparent; color: #ef4444; border: 0.5px solid rgba(239,68,68,0.3); }
        .pm-btn-danger:hover { background: rgba(239,68,68,0.1); }
        .pm-private-msg { text-align: center; padding: 20px; color: var(--color-text-tertiary); font-size: 13px; }

        /* Full-screen Chat layout */
        .chat-fullscreen-container {
          display: flex;
          height: calc(100vh - 120px);
          min-height: 500px;
          background: var(--color-background-primary);
          color: #fff;
          font-family: var(--font-sans);
          border-radius: var(--border-radius-lg);
          border: 0.5px solid var(--color-border-tertiary);
          overflow: hidden;
          margin: 16px;
        }
        .chat-fs-sidebar {
          width: 280px;
          background: var(--color-background-primary);
          border-right: 0.5px solid var(--color-border-tertiary);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .chat-fs-sidebar-header {
          padding: 14px 16px;
          border-bottom: 0.5px solid var(--color-border-tertiary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--color-background-primary);
        }
        .chat-fs-sidebar-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .chat-fs-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 0.5px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--border-radius-md);
          font-size: 11px;
          font-weight: 500;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-fs-back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-text-primary);
        }
        .chat-fs-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        .chat-fs-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: var(--border-radius-md);
          cursor: pointer;
          transition: background 0.15s;
          margin-bottom: 4px;
        }
        .chat-fs-item:hover {
          background: var(--color-background-secondary);
        }
        .chat-fs-item.active {
          background: rgba(26, 173, 82, 0.08);
          border: 0.5px solid rgba(26, 173, 82, 0.2);
        }
        .chat-fs-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--color-background-secondary);
          position: relative;
        }
        .chat-fs-header {
          height: 56px;
          padding: 0 16px;
          background: var(--color-background-primary);
          border-bottom: 0.5px solid var(--color-border-tertiary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
        }
        .chat-fs-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .chat-fs-username {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .chat-fs-status {
          font-size: 10px;
          color: #1aad52;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 1px;
        }
        .chat-fs-status.offline {
          color: var(--color-text-tertiary);
        }
        .chat-fs-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .chat-fs-btn {
          padding: 6px 12px;
          border-radius: var(--border-radius-md);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          border: none;
          font-family: var(--font-sans);
          transition: background 0.15s;
        }
        .chat-fs-btn-primary {
          background: #1aad52;
          color: #fff;
        }
        .chat-fs-btn-primary:hover {
          background: #158a42;
        }
        .chat-fs-btn-secondary {
          background: var(--color-background-secondary);
          color: var(--color-text-secondary);
          border: 0.5px solid var(--color-border-tertiary);
        }
        .chat-fs-btn-secondary:hover {
          background: var(--color-background-tertiary);
          color: var(--color-text-primary);
        }
        .chat-fs-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--color-background-tertiary);
        }
        .message-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          max-width: 65%;
        }
        .message-row.me {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .message-row.them {
          align-self: flex-start;
        }
        .message-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          border: 0.5px solid var(--color-border-tertiary);
        }
        .message-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .message-bubble {
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 12px;
          line-height: 1.4;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .message-row.me .message-bubble {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          border-bottom-right-radius: 2px;
        }
        .message-row.them .message-bubble {
          background: var(--color-background-primary);
          color: var(--color-text-primary);
          border-bottom-left-radius: 2px;
          border: 0.5px solid var(--color-border-tertiary);
        }
        .message-sender-name {
          font-size: 9px;
          font-weight: 700;
          margin-bottom: 2px;
          opacity: 0.8;
        }
        .message-time {
          font-size: 8px;
          margin-top: 3px;
          text-align: right;
          opacity: 0.6;
        }
        .chat-fs-footer {
          padding: 12px 20px;
          background: var(--color-background-primary);
          border-top: 0.5px solid var(--color-border-tertiary);
        }
        .chat-fs-input-wrap {
          display: flex;
          gap: 10px;
          background: var(--color-background-secondary);
          border: 0.5px solid var(--color-border-tertiary);
          border-radius: var(--border-radius-md);
          padding: 4px 8px;
          align-items: center;
        }
        .chat-fs-input-wrap input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--color-text-primary);
          font-size: 12px;
          padding: 6px 0;
          font-family: var(--font-sans);
        }
        .chat-fs-send-btn {
          background: #1aad52;
          color: #fff;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: var(--border-radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .chat-fs-send-btn:hover {
          background: #158a42;
        }
        .typing-indicator {
          font-size: 10px;
          color: var(--color-text-tertiary);
          padding: 0 4px 6px;
        }
        .shared-cart-card {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--color-border-tertiary);
          border-radius: var(--border-radius-md);
          padding: 10px;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .shared-cart-title {
          font-size: 10px;
          font-weight: 700;
          color: #1aad52;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .shared-cart-item {
          font-size: 11px;
          color: var(--color-text-secondary);
          display: flex;
          justify-content: space-between;
        }

        /* Mobile responsive adjustments */
        .chat-fs-mobile-back {
          display: none;
        }
        .mobile-tabs-nav {
          display: none;
        }
        @media (max-width: 768px) {
          /* General layout */
          .main {
            grid-template-columns: 1fr !important;
            padding: 8px;
            gap: 12px;
          }
          .hero {
            padding: 16px;
          }
          .hero-inner {
            flex-direction: column;
            gap: 12px;
          }
          .hero-user {
            width: 100%;
          }

          /* Mobile tabs switcher */
          .mobile-tabs-nav {
            display: flex;
            background: var(--color-background-primary);
            border-bottom: 0.5px solid var(--color-border-tertiary);
            padding: 4px;
            margin: 12px 8px 4px;
            border-radius: var(--border-radius-lg);
            gap: 4px;
          }
          .mobile-tab-btn {
            flex: 1;
            padding: 8px;
            font-size: 11px;
            font-weight: 600;
            color: var(--color-text-secondary);
            border: none;
            background: none;
            cursor: pointer;
            border-radius: var(--border-radius-md);
            text-align: center;
            transition: all 0.15s;
          }
          .mobile-tab-btn.active {
            background: #1aad52;
            color: #fff;
          }

          /* Column display toggling on mobile */
          .col-left, .col-center, .col-right {
            display: none !important;
          }
          .col-left.active-mobile, .col-center.active-mobile, .col-right.active-mobile {
            display: flex !important;
          }

          /* Chat Overlay page */
          .chat-fullscreen-container {
            margin: 8px;
            height: calc(100vh - 120px);
            border-radius: var(--border-radius-lg);
          }
          .chat-fs-sidebar {
            width: 100%;
            display: flex;
          }
          .chat-fs-main {
            display: none;
          }
          .chat-fullscreen-container.chat-selected .chat-fs-sidebar {
            display: none;
          }
          .chat-fullscreen-container.chat-selected .chat-fs-main {
            display: flex;
            width: 100%;
          }
          .chat-fs-mobile-back {
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: var(--color-text-primary);
            cursor: pointer;
            padding: 8px 4px;
            margin-right: 4px;
            border-radius: var(--border-radius-sm);
          }
          .chat-fs-messages {
            padding: 12px;
          }
          .message-row {
            max-width: 85%;
          }
          .chat-fs-actions .chat-fs-btn {
            padding: 6px 8px;
            font-size: 10px;
          }
        }
      `}</style>

      {/* ===== USER PROFILE OVERLAY ===== */}
      {(viewingProfile || loadingProfile) && (
        <div className="profile-overlay" onClick={() => { setViewingProfile(null); setLoadingProfile(false); }}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>

            {/* Close */}
            <button className="pm-close" onClick={() => { setViewingProfile(null); setLoadingProfile(false); }}>
              <X size={16} />
            </button>

            {loadingProfile ? (
              <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <div style={{ width: 44, height: 44, border: '3px solid #1aad52', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <div style={{ fontSize: 13 }}>Loading profile…</div>
              </div>
            ) : viewingProfile && (
              <>
                {/* Cover gradient */}
                <div className="pm-cover" />

                <div className="pm-body">
                  {/* Avatar + privacy row */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div className="pm-avatar-wrap">
                      <div className="pm-avatar-ring">
                        <div className="pm-avatar-inner">
                          <img src={getUserAvatarUrl(viewingProfile)} alt={viewingProfile.full_name} />
                        </div>
                      </div>
                      <div className="pm-verified" title="Lucky Cart Member">
                        <Check size={11} color="#fff" />
                      </div>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          background: viewingProfile.is_private ? 'var(--color-background-secondary)' : '#1aad5215',
                          color: viewingProfile.is_private ? 'var(--color-text-secondary)' : '#1aad52',
                          border: `0.5px solid ${viewingProfile.is_private ? 'var(--color-border-tertiary)' : '#1aad5240'}`
                        }}
                      >
                        {viewingProfile.is_private ? <Lock size={10} /> : <Globe size={10} />}
                        {viewingProfile.is_private ? 'Private' : 'Public'}
                      </span>
                    </div>
                  </div>

                  {/* Name + handle */}
                  <div className="pm-name">{viewingProfile.full_name}</div>
                  <div className="pm-handle">@{viewingProfile.username}</div>

                  {/* Role badge */}
                  {viewingProfile.role && (
                    <div
                      className="pm-role-badge"
                      style={{
                        background: viewingProfile.role === 'seller' ? '#f59e0b18' : '#1aad5215',
                        color: viewingProfile.role === 'seller' ? '#f59e0b' : '#1aad52',
                        border: `0.5px solid ${viewingProfile.role === 'seller' ? '#f59e0b40' : '#1aad5240'}`
                      }}
                    >
                      {viewingProfile.role === 'seller' ? '🏪' : '🛒'} {viewingProfile.role}
                    </div>
                  )}

                  {/* Location */}
                  {viewingProfile.city && (
                    <div className="pm-location">
                      📍 {viewingProfile.city}{viewingProfile.state ? `, ${viewingProfile.state}` : ''}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="pm-stats">
                    <div className="pm-stat">
                      <div className="pm-stat-num">{viewingProfile.followerCount ?? 0}</div>
                      <div className="pm-stat-lbl">Followers</div>
                    </div>
                    <div className="pm-divider" />
                    <div className="pm-stat">
                      <div className="pm-stat-num">{viewingProfile.followingCount ?? 0}</div>
                      <div className="pm-stat-lbl">Following</div>
                    </div>
                    <div className="pm-divider" />
                    <div className="pm-stat">
                      <div className="pm-stat-num green">{Math.round(viewingProfile.influence_score ?? 0)}</div>
                      <div className="pm-stat-lbl">Score</div>
                    </div>
                  </div>

                  {/* Private account guard */}
                  {viewingProfile.is_private && viewingProfile.followStatus !== 'accepted' && (
                    <div className="pm-private-msg">
                      <Lock size={20} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--color-text-tertiary)' }} />
                      This account is private.<br />Follow to see their content.
                    </div>
                  )}

                  {/* Connection path */}
                  {viewingProfile.connection?.path?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="pm-section-label">🔗 Connection path</div>
                      <div className="pm-path-row">
                        {viewingProfile.connection.path.map((node, idx) => (
                          <React.Fragment key={node._id}>
                            <span className="pm-path-node">
                              <img src={getUserAvatarUrl(node)} alt={node.full_name} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                              {node.full_name}
                            </span>
                            {idx < viewingProfile.connection.path.length - 1 && <span className="pm-path-arrow">→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="pm-degree">{viewingProfile.connection.degree}° connection</div>
                    </div>
                  )}

                  {/* Recent followers */}
                  {viewingProfile.recentFollowers?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="pm-section-label">Recent followers</div>
                      <div className="pm-followers-strip">
                        {viewingProfile.recentFollowers.slice(0, 6).map((f, i) => (
                          <div
                            key={f._id}
                            className="pm-follower-avatar"
                            title={f.full_name}
                            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 6 - i, position: 'relative' }}
                            onClick={() => openProfile(f._id)}
                          >
                            <img src={getUserAvatarUrl(f)} alt={f.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                        {viewingProfile.followerCount > 6 && (
                          <div style={{ marginLeft: -8, width: 30, height: 30, borderRadius: '50%', background: 'var(--color-background-secondary)', border: '2px solid var(--color-background-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--color-text-tertiary)', fontWeight: 700, position: 'relative', zIndex: 0 }}>
                            +{viewingProfile.followerCount - 6}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Public wishlist */}
                  {viewingProfile.wishlistItems?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="pm-section-label">🎁 Public wishlist</div>
                      {viewingProfile.wishlistItems.slice(0, 3).map((wi, i) => (
                        <div key={i} className="pm-wl-chip">
                          <div className="pm-wl-emoji">{wi.item?.category === 'Electronics' ? '📱' : '🎁'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="pm-wl-name truncate">{wi.item?.name}</div>
                            {wi.item?.price && <div className="pm-wl-price">₹{wi.item.price}</div>}
                          </div>
                          <button
                            onClick={() => {
                              api.post(`/cart/add/${wi.item._id}`, { quantity: 1 }, token);
                              addToast('Added to cart!', 'success');
                              refreshCart();
                            }}
                            style={{ background: '#1aad52', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pm-actions">
                    {viewingProfile.followStatus === 'none' && (
                      <button
                        className="pm-btn pm-btn-primary"
                        onClick={async () => {
                          await handleFollow(viewingProfile);
                          openProfile(viewingProfile._id);
                        }}
                      >
                        <UserPlus size={14} /> Follow
                      </button>
                    )}
                    {viewingProfile.followStatus === 'pending' && (
                      <button className="pm-btn pm-btn-secondary" style={{ flex: 1 }} disabled>
                        <Clock size={14} /> Request Sent
                      </button>
                    )}
                    {viewingProfile.followStatus === 'accepted' && (
                      <>
                        <button
                          className="pm-btn pm-btn-primary"
                          onClick={() => {
                            setViewingProfile(null);
                            selectChat(viewingProfile, 'dm');
                          }}
                        >
                          <MessageSquare size={14} /> Message
                        </button>
                        <button
                          className="pm-btn pm-btn-danger"
                          title="Unfollow"
                          onClick={async () => {
                            await api.delete(`/social/unfollow/${viewingProfile._id}`, token);
                            addToast('Unfollowed', 'success');
                            openProfile(viewingProfile._id);
                          }}
                        >
                          <UserMinus size={14} />
                        </button>
                      </>
                    )}
                    <button className="pm-btn pm-btn-secondary" onClick={() => setViewingProfile(null)}>
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeChat ? (
        /* FULL SCREEN CHAT */
        <div className={`chat-fullscreen-container ${mobileChatView === 'chat' ? 'chat-selected' : ''}`}>
          {/* Left Sidebar */}
          <div className="chat-fs-sidebar">
            <div className="chat-fs-sidebar-header">
              <span className="chat-fs-sidebar-title">
                <MessageSquare size={14} style={{ color: '#1aad52' }} /> Active Chats
              </span>
              <button className="chat-fs-back-btn" onClick={() => setActiveChat(null)}>
                <ArrowLeft size={10} /> Back
              </button>
            </div>
            <div className="chat-fs-list">
              {recentChatsList.map((chat, idx) => (
                <div 
                  key={idx}
                  onClick={() => selectChat(chat.user, 'dm')}
                  className={`chat-fs-item ${activeChat.id === chat.user._id ? 'active' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="avatar sm">
                      <img src={getUserAvatarUrl(chat.user)} alt={chat.user.full_name} />
                    </div>
                    {onlineStatusMap[chat.user._id] && <div className="online-dot" style={{ border: '2px solid var(--color-background-primary)' }}></div>}
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">{chat.user.full_name}</div>
                    <div className="chat-preview">{chat.lastMessage?.content}</div>
                  </div>
                </div>
              ))}
              {recentChatsList.length === 0 && (
                <p className="text-[10px] text-gray-500 text-center py-4">No active chats.</p>
              )}
            </div>
          </div>

          {/* Right Main Pane */}
          <div className="chat-fs-main">
            <div className="chat-fs-header">
              <div className="chat-fs-user-info" onClick={() => openProfile(activeChat.id)}>
                <button 
                  className="chat-fs-mobile-back"
                  onClick={(e) => { e.stopPropagation(); setMobileChatView('list'); }}
                  aria-label="Back to active chats"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="relative flex-shrink-0">
                  <div className="avatar sm">
                    <img src={getUserAvatarUrl({ profile_pic: activeChat.profile_pic, username: activeChat.name, full_name: activeChat.name })} alt={activeChat.name} />
                  </div>
                  {onlineStatusMap[activeChat.id] && <div className="online-dot" style={{ border: '2px solid var(--color-background-primary)' }}></div>}
                </div>
                <div>
                  <div className="chat-fs-username">{activeChat.name}</div>
                  <div className={`chat-fs-status ${!onlineStatusMap[activeChat.id] ? 'offline' : ''}`}>
                    {onlineStatusMap[activeChat.id] ? 'online' : 'offline'}
                  </div>
                </div>
              </div>

              <div className="chat-fs-actions">
                <button 
                  onClick={() => {
                    handleSendMessage(null, {
                      type: 'CART',
                      payload: { cartItems: [] }
                    });
                    addToast('Cart shared to conversation!', 'success');
                  }}
                  className="chat-fs-btn chat-fs-btn-secondary"
                  style={{ color: '#10b981' }}
                >
                  <Share2 size={12} /> Share Cart
                </button>
                <button className="chat-fs-btn chat-fs-btn-primary" onClick={() => openProfile(activeChat.id)}>
                  View Profile
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="chat-fs-messages">
              {chatMessages.map((msg, index) => {
                const isMe = msg.sender._id?.toString() === currentUserData?._id?.toString() || msg.sender === currentUserData?._id;
                const senderUserObj = isMe ? currentUserData : msg.sender;
                
                return (
                  <div key={index} className={`message-row ${isMe ? 'me' : 'them'}`}>
                    <div className="message-avatar">
                      <img src={getUserAvatarUrl(senderUserObj)} alt={senderUserObj?.full_name || 'user'} />
                    </div>
                    <div className="message-bubble">
                      {!isMe && <div className="message-sender-name">{senderUserObj?.full_name}</div>}
                      <div>{msg.content}</div>
                      
                      {/* Shared cart preview */}
                      {msg.message_type === 'CART' && msg.metadata?.cartItems && (
                        <div className="shared-cart-card">
                          <div className="shared-cart-title">🛒 Shared Shopping Cart</div>
                          {msg.metadata.cartItems.map((item, cIdx) => (
                            <div key={cIdx} className="shared-cart-item">
                              <span>{item.product?.name || 'Product'} (x{item.quantity})</span>
                              <span className="text-emerald-400">${item.product?.price}</span>
                            </div>
                          ))}
                          <button 
                            onClick={() => handleCloneCart(msg.metadata.cartItems)}
                            style={{ width: '100%', marginTop: 8, background: '#1aad52', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', cursor: 'pointer' }}
                          >
                            Copy to My Cart
                          </button>
                        </div>
                      )}
                      
                      <div className="message-time">
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="chat-fs-footer">
              {typingUsers.size > 0 && (
                <div className="typing-indicator">
                  {Array.from(typingUsers).join(', ')} is typing...
                </div>
              )}
              <form onSubmit={handleSendMessage} className="chat-fs-input-wrap">
                <input
                  type="text"
                  placeholder="Write a message..."
                  value={chatInput}
                  onChange={handleTyping}
                />
                <button type="submit" className="chat-fs-send-btn">
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Hero section */}
          <div className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-label">
              <Sparkles size={13} style={{ marginRight: '6px' }} />
              Product Social Graph Engine
            </div>
            <div className="hero-title">LUCKY <span>SOCIAL</span></div>
            <div className="hero-sub">Discover products trending in your network and coordinate purchases with friends.</div>
          </div>
          {currentUserData && (
            <div className="hero-user">
              <div className="relative">
                <div className="avatar">
                  <img src={getUserAvatarUrl(currentUserData)} alt="me" />
                </div>
                <div className="online-dot"></div>
              </div>
              <div>
                <div className="hero-user-name">{currentUserData.full_name}</div>
                <div className="hero-rank">
                  <Star size={11} className="fill-current text-emerald-400" />
                  Rank #{currentUserData.influence_score ? Math.round(currentUserData.influence_score) : 2} in network
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="mobile-tabs-nav">
        <button 
          className={`mobile-tab-btn ${mobileTab === 'feed' ? 'active' : ''}`}
          onClick={() => setMobileTab('feed')}
        >
          Feed
        </button>
        <button 
          className={`mobile-tab-btn ${mobileTab === 'network' ? 'active' : ''}`}
          onClick={() => setMobileTab('network')}
        >
          Network
        </button>
        <button 
          className={`mobile-tab-btn ${mobileTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setMobileTab('dashboard')}
        >
          Dashboard
        </button>
      </div>

      {/* Main Layout grid */}
      <div className="main">
        
        {/* Left column */}
        <div className={`col col-left ${mobileTab === 'network' ? 'active-mobile' : ''}`}>
          
          {/* Search box */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Search size={14} style={{ marginRight: '6px' }} />
                Search network
              </div>
            </div>
            <div className="card-body">
              <div className="search-box">
                <Search size={15} style={{ color: 'var(--color-text-tertiary)' }} />
                <input 
                  type="text" 
                  placeholder="Search username…" 
                  value={searchQuery}
                  onChange={handleSearch}
                  aria-label="Search username" 
                />
              </div>

              {/* Search results list */}
              {searchResults.length > 0 && (
                <div className="space-y-2 mt-3 max-h-[160px] overflow-y-auto pr-1">
                  {searchResults.map(u => (
                    <div 
                      key={u._id} 
                      className="flex items-center justify-between p-2 hover:bg-zinc-800/40 rounded-xl"
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                        onClick={() => openProfile(u._id)}
                        title="View profile"
                      >
                        <div className="avatar xs flex-shrink-0">
                          <img src={getUserAvatarUrl(u)} alt={u.full_name} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-white truncate">{u.full_name}</p>
                          <p className="text-[9px] text-gray-500">@{u.username}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {u.followStatus === 'none' && (
                          <button onClick={() => handleFollow(u)} className="px-2.5 py-1 bg-[#1aad52] hover:bg-[#158a42] text-white text-[10px] font-bold rounded">
                            Follow
                          </button>
                        )}
                        {u.followStatus === 'pending' && (
                          <span className="text-[9px] text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded">Pending</span>
                        )}
                        {u.followStatus === 'accepted' && (
                          <button onClick={() => selectChat(u, 'dm')} className="px-2.5 py-1 bg-zinc-800 text-[#1aad52] hover:text-white text-[10px] font-bold rounded">
                            Chat
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active chats */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <MessageSquare size={14} style={{ marginRight: '6px' }} />
                Active chats
              </div>
              <button onClick={() => setIsCreatingGroup(!isCreatingGroup)} className="add-group-btn">
                <Plus size={12} />
                Group
              </button>
            </div>
            <div className="card-body" style={{ padding: '8px 14px' }}>
              {isCreatingGroup && (
                <form onSubmit={handleCreateGroup} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Group Name"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    className="w-full bg-[#12151B] border border-zinc-800 rounded-lg p-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Short Description"
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                    className="w-full bg-[#12151B] border border-zinc-800 rounded-lg p-2 text-xs text-white"
                  />
                  <div className="flex justify-end gap-2 text-[10px]">
                    <button type="button" onClick={() => setIsCreatingGroup(false)} className="px-2 py-1 bg-zinc-800 text-white rounded">Cancel</button>
                    <button type="submit" className="px-2 py-1 bg-[#1aad52] text-white font-bold rounded">Create</button>
                  </div>
                </form>
              )}
              
              <div className="space-y-1 max-h-[220px] overflow-y-auto">
                {recentChatsList.map((chat, idx) => (
                  <div 
                    key={idx}
                    onClick={() => selectChat(chat.user, 'dm')}
                    className={`chat-item ${activeChat && activeChat.id === chat.user._id ? 'bg-[#1aad52]/10' : ''}`}
                  >
                    <div
                      className="relative flex-shrink-0"
                      onClick={e => { e.stopPropagation(); openProfile(chat.user._id); }}
                      title="View profile"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="avatar sm">
                        <img src={getUserAvatarUrl(chat.user)} alt={chat.user.full_name} />
                      </div>
                      {onlineStatusMap[chat.user._id] && <div className="online-dot"></div>}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{chat.user.full_name}</div>
                      <div className="chat-preview">{chat.lastMessage?.content}</div>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>now</div>
                  </div>
                ))}

                {recentChatsList.length === 0 && (
                  <p className="text-[10px] text-gray-500 text-center py-4">No active chats.</p>
                )}
              </div>
            </div>
          </div>

          {/* Suggested groups */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Users size={14} style={{ marginRight: '6px' }} />
                Suggested groups
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupRecommendations.map(group => (
                <div key={group._id} className="group-card" onClick={() => selectChat(group, 'group')}>
                  <div className="group-name">{group.name}</div>
                  <div className="group-desc">{group.description}</div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleJoinGroup(group._id); }} 
                    className="btn-green"
                  >
                    Join group
                  </button>
                </div>
              ))}
              {groupRecommendations.length === 0 && (
                <p className="text-[10px] text-gray-500 text-center py-2">No suggested groups.</p>
              )}
            </div>
          </div>
        </div>

        {/* Center column */}
        <div className={`col col-center ${mobileTab === 'feed' ? 'active-mobile' : ''}`}>
          
          <div className="card" style={{ padding: 0 }}>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'feed' ? 'active' : ''}`}
                onClick={() => setActiveTab('feed')}
              >
                Popular in network
              </button>
              <button 
                className={`tab ${activeTab === 'wishlists' ? 'active' : ''}`}
                onClick={() => setActiveTab('wishlists')}
              >
                Shared wishlists
              </button>
              <button 
                className={`tab ${activeTab === 'carts' ? 'active' : ''}`}
                onClick={() => setActiveTab('carts')}
              >
                Shared carts
              </button>
            </div>

            {/* Panel: Popular in network */}
            {activeTab === 'feed' && (
              <div className="product-grid">
                {sharedProducts.map(prod => (
                  <div key={prod._id} className="product-card">
                    {prod.user_file ? (
                      <img src={prod.user_file} alt={prod.name} className="product-img object-cover" style={{ height: '140px', width: '100%' }} />
                    ) : (
                      <div className="product-img">🎁</div>
                    )}
                    <div className="product-body">
                      <div className="product-cat">{prod.category}</div>
                      <div className="product-name">{prod.name}</div>
                      <div className="product-desc">{prod.description}</div>
                      <div className="product-footer">
                        <div className="product-price">₹{prod.price}</div>
                        <button 
                          onClick={() => {
                            api.post(`/cart/add/${prod._id}`, { quantity: 1 }, token);
                            addToast('Item added to cart!', 'success');
                            refreshCart();
                          }}
                          className="add-btn"
                        >
                          <ShoppingCart size={13} style={{ marginRight: '5px' }} />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {sharedProducts.length === 0 && (
                  <div style={{ gridColumn: 'span 2', padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No items currently trending in your connections network.
                  </div>
                )}
              </div>
            )}

            {/* Panel: Shared Wishlists */}
            {activeTab === 'wishlists' && (
              <div>
                {following.map(friend => (
                  <div key={friend._id} className="wishlist-item">
                    <div className="wishlist-emoji">🎁</div>
                    <div className="wishlist-info">
                      <div className="wishlist-name">{friend.full_name}'s Wishlist</div>
                      <div className="wishlist-owner">@{friend.username}</div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          const data = await api.get(`/social/profile/${friend._id}`, token);
                          if (data?.profile?.wishlistItems) {
                            handleCloneWishlist(data.profile.wishlistItems);
                          } else {
                            addToast('This wishlist is empty or private.', 'danger');
                          }
                        } catch {
                          addToast('Error cloning wishlist', 'danger');
                        }
                      }}
                      className="tag-green cursor-pointer hover:bg-emerald-500 hover:text-black transition-all"
                    >
                      Clone
                    </button>
                  </div>
                ))}
                {following.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    You are not following anyone yet to see wishlists.
                  </div>
                )}
              </div>
            )}

            {/* Panel: Shared Carts */}
            {activeTab === 'carts' && (
              <div>
                <div className="wishlist-item">
                  <div className="wishlist-emoji">🛒</div>
                  <div className="wishlist-info">
                    <div className="wishlist-name">Gaming Gears Setup</div>
                    <div className="wishlist-owner">Budget setups from active network</div>
                  </div>
                  <button 
                    onClick={() => {
                      if (sharedProducts.length > 0) {
                        handleCloneCart(sharedProducts.map(p => ({ product: p, quantity: 1 })));
                      } else {
                        addToast('No items available to clone.', 'danger');
                      }
                    }}
                    className="tag-green cursor-pointer hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    Clone
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right column */}
        <div className={`col col-right ${mobileTab === 'dashboard' ? 'active-mobile' : ''}`}>
          
          {/* Settings */}
          {currentUserData && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <Shield size={14} style={{ marginRight: '6px' }} />
                  Account settings
                </div>
              </div>
              <div className="card-body">
                <div className="privacy-row">
                  <div>
                    <div className="privacy-label">Profile privacy</div>
                    <div className="privacy-sub">{currentUserData.is_private ? 'Private account' : 'Public account'}</div>
                  </div>
                  <div 
                    className={`toggle ${currentUserData.is_private ? 'checked' : 'unchecked'}`}
                    onClick={handleTogglePrivacy}
                    role="switch" 
                    aria-checked={currentUserData.is_private} 
                    aria-label="Profile privacy toggle"
                  ></div>
                </div>
                <div style={{ marginTop: '12px', borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '12px' }}>
                  <div className="privacy-row">
                    <div>
                      <div className="privacy-label">Activity status</div>
                      <div className="privacy-sub">Show online</div>
                    </div>
                    <div className="toggle checked" role="switch" aria-checked="true" aria-label="Activity status toggle"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BFS Path Visualizer */}
          {selectedUserPath && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <Sparkles size={12} style={{ marginRight: '6px' }} />
                  BFS Network Connection
                </div>
              </div>
              <div className="card-body flex flex-col gap-2">
                {selectedUserPath.path.map((node, idx) => (
                  <div key={node._id} className="flex flex-col items-center">
                    <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 w-full justify-center">
                      <div className="avatar xs">
                        <img src={getUserAvatarUrl(node)} alt={node.full_name} />
                      </div>
                      <span className="text-[11px] font-bold text-gray-200">{node.full_name}</span>
                    </div>
                    {idx < selectedUserPath.path.length - 1 && (
                      <div className="w-0.5 h-4 bg-emerald-500/40 my-1 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow requests pending */}
          {followRequests.length > 0 && (
            <div className="card" style={{ border: '0.5px solid rgba(234,179,8,0.2)' }}>
              <div className="card-head">
                <div className="card-title" style={{ color: 'var(--color-text-primary)' }}>
                  <Clock size={14} style={{ marginRight: '6px' }} />
                  Requests ({followRequests.length})
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {followRequests.map(req => (
                  <div key={req._id} className="flex items-center justify-between p-2 bg-zinc-900 rounded-xl">
                    <span
                      className="text-xs font-bold truncate pr-2 cursor-pointer hover:text-emerald-400 transition-colors"
                      onClick={() => openProfile(req.follower._id)}
                      title="View profile"
                    >
                      {req.follower.full_name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleAcceptRequest(req._id)} className="px-2 py-1 bg-[#1aad52] text-white rounded text-[9px] font-bold">
                        Accept
                      </button>
                      <button onClick={() => handleRejectRequest(req._id)} className="px-2 py-1 bg-zinc-800 text-gray-400 rounded text-[9px]">
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Network Influencers PageRank */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Award size={14} style={{ marginRight: '6px' }} />
                Network influencers
              </div>
            </div>
            <div className="card-body" style={{ padding: '8px 14px' }}>
              {influenceRankings.map((inf, idx) => (
                <div
                  key={inf._id}
                  className="influencer-row"
                  onClick={() => openProfile(inf._id)}
                  style={{ cursor: 'pointer' }}
                  title={`View ${inf.full_name}'s profile`}
                >
                  <div className={`rank-num ${idx === 0 ? 'gold' : ''}`}>#{idx + 1}</div>
                  <div className="avatar xs" style={{ overflow: 'hidden', flexShrink: 0 }}>
                    <img src={getUserAvatarUrl(inf)} alt={inf.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  </div>
                  <div className="influencer-info">
                    <div className="influencer-name">{inf.full_name}</div>
                    <div className="influencer-handle">@{inf.username}</div>
                  </div>
                  <div className="star-badge">★ {Math.round(inf.influence_score)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Your Activity statistics */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <TrendingUp size={14} style={{ marginRight: '6px' }} />
                Your activity
              </div>
            </div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1aad52' }}>12</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Shared</div>
              </div>
              <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1aad52' }}>{following.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Friends</div>
              </div>
              <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1aad52' }}>3</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Wishlists</div>
              </div>
              <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1aad52' }}>{currentUserData?.influence_score ? Math.round(currentUserData.influence_score) : 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Score</div>
              </div>
            </div>
          </div>

        </div>

      </div>
      </>
      )}

    </div>
  );
};

export default Social;
