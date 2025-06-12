import { Server, Socket } from 'socket.io';
import { User, UserManager } from '../models/User';
import { Message, MessageManager } from '../models/Message';

export class ChatController {
  private io: Server;
  private userManager: UserManager;
  private messageManager: MessageManager;

  constructor(io: Server, users: Map<string, User>, messages: Message[]) {
    this.io = io;
    this.userManager = new UserManager(users);
    this.messageManager = new MessageManager(messages);
  }

  handleConnection(socket: Socket): void {
    socket.on('user:join', (userData: { username: string }) => {
      const user: User = {
        id: this.generateUserId(),
        username: userData.username,
        socketId: socket.id,
        joinedAt: new Date(),
        isOnline: true
      };

      this.userManager.addUser(user);

      socket.emit('user:joined', {
        user,
        messages: this.messageManager.getMessages()
      });

      const systemMessage = this.messageManager.createSystemMessage(
        `${user.username} dołączył/a do chatu`
      );
      this.messageManager.addMessage(systemMessage);
      
      this.io.emit('message:new', systemMessage);
      this.io.emit('users:update', this.userManager.getOnlineUsers());

      console.log(`User ${user.username} joined the chat`);
    });

    socket.on('message:send', (messageData: { content: string }) => {
      const user = this.userManager.getUserBySocketId(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const message: Message = {
        id: this.generateMessageId(),
        userId: user.id,
        username: user.username,
        content: messageData.content,
        timestamp: new Date(),
        type: 'text'
      };

      this.messageManager.addMessage(message);
      this.io.emit('message:new', message);
    });

    socket.on('message:edit', (data: { messageId: string; newContent: string }) => {
      const user = this.userManager.getUserBySocketId(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const message = this.messageManager.getMessageById(data.messageId);
      if (!message || message.userId !== user.id) {
        socket.emit('error', { message: 'Cannot edit this message' });
        return;
      }

      if (this.messageManager.updateMessage(data.messageId, data.newContent)) {
        this.io.emit('message:edited', {
          messageId: data.messageId,
          newContent: data.newContent,
          editedAt: new Date()
        });
      }
    });

    socket.on('message:delete', (data: { messageId: string }) => {
      const user = this.userManager.getUserBySocketId(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const message = this.messageManager.getMessageById(data.messageId);
      if (!message || message.userId !== user.id) {
        socket.emit('error', { message: 'Cannot delete this message' });
        return;
      }

      if (this.messageManager.deleteMessage(data.messageId)) {
        this.io.emit('message:deleted', { messageId: data.messageId });
      }
    });

    socket.on('typing:start', () => {
      const user = this.userManager.getUserBySocketId(socket.id);
      if (user) {
        socket.broadcast.emit('typing:start', { 
          userId: user.id, 
          username: user.username 
        });
      }
    });

    socket.on('typing:stop', () => {
      const user = this.userManager.getUserBySocketId(socket.id);
      if (user) {
        socket.broadcast.emit('typing:stop', { 
          userId: user.id, 
          username: user.username 
        });
      }
    });

    socket.on('message:private', (data: { targetUserId: string; content: string }) => {
      const sender = this.userManager.getUserBySocketId(socket.id);
      const target = this.userManager.getUserById(data.targetUserId);

      if (!sender || !target) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const message: Message = {
        id: this.generateMessageId(),
        userId: sender.id,
        username: sender.username,
        content: data.content,
        timestamp: new Date(),
        type: 'text'
      };

      socket.emit('message:private', { message, from: sender, to: target });
      this.io.to(target.socketId).emit('message:private', { message, from: sender, to: target });
    });
  }

  handleDisconnection(socket: Socket): void {
    const user = this.userManager.getUserBySocketId(socket.id);
    if (user) {
      this.userManager.setUserOffline(socket.id);
      
      const systemMessage = this.messageManager.createSystemMessage(
        `${user.username} opuścił/a chat`
      );
      this.messageManager.addMessage(systemMessage);
      
      this.io.emit('message:new', systemMessage);
      this.io.emit('users:update', this.userManager.getOnlineUsers());

      console.log(`User ${user.username} left the chat`);
    }
  }

  private generateUserId(): string {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
