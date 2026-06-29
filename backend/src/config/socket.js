import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, Message, Group, Notification } from '../models/index.js';

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

    // Join Group Room
    socket.on('join_group', (data) => {
      const { groupId } = data;
      if (!groupId) return;
      socket.join(`group_${groupId}`);
    });

    // Direct Message Handler
    socket.on('send_dm', async (data) => {
      try {
        const { recipientId, content, messageType, metadata, replyTo } = data;
        if (!recipientId || !content) return;

        // Check if recipient is online and has this sender's chat active
        const recipientSocketId = onlineUsers.get(recipientId);
        let isRead = false;
        if (recipientSocketId) {
          const recipientSocket = io.sockets.sockets.get(recipientSocketId);
          if (recipientSocket && recipientSocket.activeChatId === userId) {
            isRead = true;
          }
        }

        const message = await Message.create({
          sender: socket.user._id,
          recipient: recipientId,
          message_type: messageType || 'TEXT',
          content,
          metadata,
          replyTo: replyTo || null,
          is_read: isRead
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username full_name profile_pic')
          .populate('recipient', 'username full_name profile_pic')
          .populate('metadata.productId', 'name price user_file description')
          .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'username full_name' }
          });

        // Emit to recipient and sender (all active tabs)
        io.to(recipientId).to(userId).emit('receive_dm', populatedMessage);

        if (!isRead) {
          const senderName = socket.user.full_name || socket.user.username;
          await new Notification({
            user: recipientId,
            message: `💬 New message from ${senderName}: "${content.length > 50 ? content.slice(0, 50) + '...' : content}"`
          }).save().catch(err => console.error("Error saving DM Notification:", err));
        }
      } catch (err) {
        socket.emit('error_message', { message: err.message });
      }
    });

    // Group Message Handler
    socket.on('send_group_msg', async (data) => {
      try {
        const { groupId, content, messageType, metadata, replyTo } = data;
        if (!groupId || !content) return;

        const message = await Message.create({
          sender: socket.user._id,
          group: groupId,
          message_type: messageType || 'TEXT',
          content,
          metadata,
          replyTo: replyTo || null
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username full_name profile_pic')
          .populate('group', 'name')
          .populate('metadata.productId', 'name price user_file description')
          .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'username full_name' }
          });

        // Emit to group room
        io.to(`group_${groupId}`).emit('receive_group_msg', { groupId, message: populatedMessage });

        // Save DB notifications for inactive members
        const groupObj = await Group.findById(groupId);
        if (groupObj) {
          const senderName = socket.user.full_name || socket.user.username;
          for (const memberId of groupObj.members) {
            if (memberId.toString() === userId) continue;

            let memberHasGroupActive = false;
            const memberSocketId = onlineUsers.get(memberId.toString());
            if (memberSocketId) {
              const memberSocket = io.sockets.sockets.get(memberSocketId);
              if (memberSocket && memberSocket.activeChatId === groupId) {
                memberHasGroupActive = true;
              }
            }

            if (!memberHasGroupActive) {
              await new Notification({
                user: memberId,
                message: `👥 New message in group "${groupObj.name}" from ${senderName}: "${content.length > 50 ? content.slice(0, 50) + '...' : content}"`
              }).save().catch(err => console.error("Error creating Group Notification:", err));
            }
          }
        }
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

    // Toggle message reaction
    socket.on('toggle_reaction', async (data) => {
      try {
        const { messageId, emoji } = data;
        if (!messageId || !emoji) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        if (!message.reactions) {
          message.reactions = new Map();
        }

        let usersList = message.reactions.get(emoji) || [];
        const userIndex = usersList.indexOf(userId);

        if (userIndex > -1) {
          usersList.splice(userIndex, 1);
        } else {
          usersList.push(userId);
        }

        if (usersList.length === 0) {
          message.reactions.delete(emoji);
        } else {
          message.reactions.set(emoji, usersList);
        }

        message.markModified('reactions');
        await message.save();

        const updatedMsg = await Message.findById(messageId)
          .populate('sender', 'username full_name profile_pic')
          .populate('recipient', 'username full_name profile_pic')
          .populate('metadata.productId', 'name price user_file description')
          .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'username full_name' }
          });

        if (message.group) {
          io.to(`group_${message.group.toString()}`).emit('message_reaction_updated', { messageId, message: updatedMsg });
        } else {
          io.to(message.sender.toString()).to(message.recipient.toString()).emit('message_reaction_updated', { messageId, message: updatedMsg });
        }
      } catch (err) {
        socket.emit('error_message', { message: err.message });
      }
    });

    // Track currently active chat target for real-time double ticks
    socket.on('set_active_chat', (data) => {
      const { chatId } = data;
      socket.activeChatId = chatId ? chatId.toString() : null;
    });

    // Mark messages read handler
    socket.on('mark_messages_read', async (data) => {
      try {
        const { senderId } = data;
        if (!senderId) return;

        await Message.updateMany(
          { sender: senderId, recipient: userId, is_read: false },
          { $set: { is_read: true } }
        );

        // Emit message read notification back to sender
        io.to(senderId).emit('messages_read_by_recipient', { readerId: userId });
      } catch (err) {
        console.error('Error marking messages read:', err.message);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_status_change', { userId, status: 'offline' });
    });
  });

  return io;
};
