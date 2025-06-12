export interface User {
  id: string;
  username: string;
  socketId: string;
  joinedAt: Date;
  isOnline: boolean;
  avatar?: string;
}

export class UserManager {
  private users: Map<string, User>;

  constructor(users: Map<string, User>) {
    this.users = users;
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  getUserBySocketId(socketId: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.socketId === socketId) {
        return user;
      }
    }
    return undefined;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getOnlineUsers(): User[] {
    return this.getAllUsers().filter(user => user.isOnline);
  }

  setUserOffline(socketId: string): void {
    const user = this.getUserBySocketId(socketId);
    if (user) {
      user.isOnline = false;
    }
  }

  setUserOnline(socketId: string): void {
    const user = this.getUserBySocketId(socketId);
    if (user) {
      user.isOnline = true;
    }
  }
}
