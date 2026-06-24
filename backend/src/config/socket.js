import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, Message, Group } from '../models/index.js';

const onlineUsers = new Map(); // userId -> socketId

export const setupSocket = (server, allowedOrigins) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  // Authentication Middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const secret = process.env.JWT_SECRET || 'ec9439cfc6c796ae2029594d_jwt';
      const decoded = jwt.verify(token, secret);

      if (decoded.role === 'admin') {
        socket.user = { _id: 'admin', username: 'admin1234', role: 'admin' };
        return next();
      }

      const user = await User.findById(decoded.id).select('_id username full_name profile_pic');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);
    
    // Join personal private room
    socket.join(userId);

    // Broadcast online status
    socket.broadcast.emit('user_status_change', { userId, status: 'online' });

    // Join all groups the user is a member of
    try {
      const userGroups = await Group.find({ members: socket.user._id }).select('_id');
      userGroups.forEach(group => {
        socket.join(`group_${group._id.toString()}`);
      });
    } catch (err) {
      console.error('Error joining group rooms:', err.message);
    }

    // Direct Message Handler
    socket.on('send_dm', async (data) => {
      try {
        const { recipientId, content, messageType, metadata } = data;
        if (!recipientId || !content) return;

        const message = await Message.create({
          sender: socket.user._id,
          recipient: recipientId,
          message_type: messageType || 'TEXT',
          content,
          metadata
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username full_name profile_pic')
          .populate('recipient', 'username full_name profile_pic')
          .populate('metadata.productId', 'name price user_file description');

        // Emit to recipient and sender (all active tabs)
        io.to(recipientId).to(userId).emit('receive_dm', populatedMessage);
      } catch (err) {
        socket.emit('error_message', { message: err.message });
      }
    });

    // Group Message Handler
    socket.on('send_group_msg', async (data) => {
      try {
        const { groupId, content, messageType, metadata } = data;
        if (!groupId || !content) return;

        const message = await Message.create({
          sender: socket.user._id,
          group: groupId,
          message_type: messageType || 'TEXT',
          content,
          metadata
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username full_name profile_pic')
          .populate('metadata.productId', 'name price user_file description');

        // Emit to group room
        io.to(`group_${groupId}`).emit('receive_group_msg', { groupId, message: populatedMessage });
      } catch (err) {
        socket.emit('error_message', { message: err.message });
      }
    });

    // Typing Status Events
    socket.on('typing_start', (data) => {
      const { targetId, isGroup } = data;
      if (isGroup) {
        socket.to(`group_${targetId}`).emit('user_typing_start', { userId, username: socket.user.username, groupId: targetId });
      } else {
        io.to(targetId).emit('user_typing_start', { userId, username: socket.user.username });
      }
    });

    socket.on('typing_stop', (data) => {
      const { targetId, isGroup } = data;
      if (isGroup) {
        socket.to(`group_${targetId}`).emit('user_typing_stop', { userId, groupId: targetId });
      } else {
        io.to(targetId).emit('user_typing_stop', { userId });
      }
    });

    // Query active online status of specific users
    socket.on('check_online_status', (data) => {
      const { userIds } = data;
      if (!userIds || !Array.isArray(userIds)) return;
      const statusMap = {};
      userIds.forEach(id => {
        statusMap[id] = onlineUsers.has(id.toString()) ? 'online' : 'offline';
      });
      socket.emit('online_status_response', statusMap);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_status_change', { userId, status: 'offline' });
    });
  });

  return io;
};
