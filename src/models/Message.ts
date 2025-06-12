export interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'image';
  isEdited?: boolean;
  editedAt?: Date;
  replyTo?: string;
}

export class MessageManager {
  private messages: Message[];

  constructor(messages: Message[]) {
    this.messages = messages;
  }

  addMessage(message: Message): void {
    this.messages.push(message);
    
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }

  getMessages(limit: number = 50): Message[] {
    return this.messages.slice(-limit);
  }

  getMessageById(id: string): Message | undefined {
    return this.messages.find(msg => msg.id === id);
  }

  updateMessage(id: string, newContent: string): boolean {
    const message = this.getMessageById(id);
    if (message) {
      message.content = newContent;
      message.isEdited = true;
      message.editedAt = new Date();
      return true;
    }
    return false;
  }

  deleteMessage(id: string): boolean {
    const index = this.messages.findIndex(msg => msg.id === id);
    if (index !== -1) {
      this.messages.splice(index, 1);
      return true;
    }
    return false;
  }

  getMessagesFromUser(userId: string): Message[] {
    return this.messages.filter(msg => msg.userId === userId);
  }

  createSystemMessage(content: string): Message {
    return {
      id: this.generateId(),
      userId: 'system',
      username: 'System',
      content,
      timestamp: new Date(),
      type: 'system'
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
