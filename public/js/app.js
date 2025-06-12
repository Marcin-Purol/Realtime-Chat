class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.isTyping = false;
        this.typingTimeout = null;
        this.typingUsers = new Set();
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.loginScreen = document.getElementById('loginScreen');
        this.chatInterface = document.getElementById('chatInterface');
        this.loadingScreen = document.getElementById('loadingScreen');
        
        this.loginForm = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.usersList = document.getElementById('usersList');
        this.userCount = document.getElementById('userCount');
        this.currentUserSpan = document.getElementById('currentUser');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.toastContainer = document.getElementById('toastContainer');
    }

    bindEvents() {
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinChat();
        });

        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        this.messageInput.addEventListener('input', () => {
            this.handleTyping();
        });

        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.logoutBtn.addEventListener('click', () => {
            this.logout();
        });

        this.sendBtn.addEventListener('click', (e) => {
            if (this.sendBtn.disabled) {
                e.preventDefault();
            }
        });
    }

    joinChat() {
        const username = this.usernameInput.value.trim();
        if (!username) {
            this.showToast('Wprowadź nazwę użytkownika', 'error');
            return;
        }

        if (username.length > 20) {
            this.showToast('Nazwa użytkownika nie może być dłuższa niż 20 znaków', 'error');
            return;
        }

        this.showLoading();
        this.connectSocket(username);
    }

    connectSocket(username) {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
            this.socket.emit('user:join', { username });
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('user:joined', (data) => {
            this.currentUser = data.user;
            this.hideLoading();
            this.showChatInterface();
            this.loadMessages(data.messages);
            this.showToast(`Witaj w czacie, ${this.currentUser.username}!`, 'success');
        });

        this.socket.on('message:new', (message) => {
            this.addMessage(message);
        });

        this.socket.on('message:edited', (data) => {
            this.updateMessage(data.messageId, data.newContent, data.editedAt);
        });

        this.socket.on('message:deleted', (data) => {
            this.removeMessage(data.messageId);
        });

        this.socket.on('users:update', (users) => {
            this.updateUsersList(users);
        });

        this.socket.on('typing:start', (data) => {
            this.addTypingUser(data.username);
        });

        this.socket.on('typing:stop', (data) => {
            this.removeTypingUser(data.username);
        });

        this.socket.on('error', (data) => {
            this.showToast(data.message, 'error');
        });

        this.socket.on('connect_error', () => {
            this.hideLoading();
            this.showToast('Nie można połączyć z serwerem', 'error');
        });
    }

    showLoading() {
        this.loadingScreen.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingScreen.classList.add('hidden');
    }

    showChatInterface() {
        this.loginScreen.classList.add('hidden');
        this.chatInterface.classList.remove('hidden');
        this.currentUserSpan.textContent = this.currentUser.username;
        this.messageInput.focus();
    }

    updateConnectionStatus(isConnected) {
        const statusIcon = this.connectionStatus.querySelector('i');
        const statusText = this.connectionStatus.childNodes[1];
        
        if (isConnected) {
            statusIcon.className = 'fas fa-circle';
            statusText.textContent = 'Online';
            this.connectionStatus.style.color = '#10b981';
        } else {
            statusIcon.className = 'fas fa-exclamation-circle';
            statusText.textContent = ' Rozłączony';
            this.connectionStatus.style.color = '#ef4444';
        }
    }

    loadMessages(messages) {
        this.messagesContainer.innerHTML = '';
        messages.forEach(message => this.addMessage(message, false));
    }

    addMessage(message, shouldScroll = true) {
        const messageElement = this.createMessageElement(message);
        this.messagesContainer.appendChild(messageElement);
        
        if (shouldScroll) {
            this.scrollToBottom();
        }
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}`;
        messageDiv.dataset.messageId = message.id;
        
        if (this.currentUser && message.userId === this.currentUser.id) {
            messageDiv.classList.add('own');
        }

        if (message.type === 'system') {
            messageDiv.innerHTML = `
                <div class="message-content">
                    ${this.escapeHtml(message.content)}
                </div>
            `;
        } else {
            const time = new Date(message.timestamp).toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit'
            });

            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">${this.escapeHtml(message.username)}</span>
                        <span class="message-time">${time}</span>
                        ${message.isEdited ? '<span class="message-edited">(edytowane)</span>' : ''}
                    </div>
                    <div class="message-text">${this.escapeHtml(message.content)}</div>
                </div>
            `;
        }

        return messageDiv;
    }

    updateMessage(messageId, newContent, editedAt) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const textElement = messageElement.querySelector('.message-text');
            const headerElement = messageElement.querySelector('.message-header');
            
            if (textElement) {
                textElement.textContent = newContent;
            }
            
            if (headerElement && !headerElement.querySelector('.message-edited')) {
                headerElement.innerHTML += '<span class="message-edited">(edytowane)</span>';
            }
        }
    }

    removeMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }
    }

    sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || !this.socket) return;

        this.socket.emit('message:send', { content });
        this.messageInput.value = '';
        this.stopTyping();
    }

    handleTyping() {
        if (!this.socket) return;

        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing:start');
        }

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 1000);
    }

    stopTyping() {
        if (this.isTyping && this.socket) {
            this.isTyping = false;
            this.socket.emit('typing:stop');
        }
        clearTimeout(this.typingTimeout);
    }

    addTypingUser(username) {
        this.typingUsers.add(username);
        this.updateTypingIndicator();
    }

    removeTypingUser(username) {
        this.typingUsers.delete(username);
        this.updateTypingIndicator();
    }

    updateTypingIndicator() {
        if (this.typingUsers.size === 0) {
            this.typingIndicator.classList.add('hidden');
            return;
        }

        const users = Array.from(this.typingUsers);
        let text;
        
        if (users.length === 1) {
            text = `${users[0]} pisze...`;
        } else if (users.length === 2) {
            text = `${users[0]} i ${users[1]} piszą...`;
        } else {
            text = `${users[0]} i ${users.length - 1} innych pisze...`;
        }

        this.typingIndicator.querySelector('.typing-text').textContent = text;
        this.typingIndicator.classList.remove('hidden');
    }

    updateUsersList(users) {
        this.usersList.innerHTML = '';
        this.userCount.textContent = users.length;

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            
            const avatarLetter = user.username.charAt(0).toUpperCase();
            
            userElement.innerHTML = `
                <div class="user-avatar">${avatarLetter}</div>
                <div class="user-info">
                    <div class="user-name">${this.escapeHtml(user.username)}</div>
                    <div class="user-status">
                        <i class="fas fa-circle"></i>
                        Online
                    </div>
                </div>
            `;
            
            this.usersList.appendChild(userElement);
        });
    }

    logout() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.currentUser = null;
        this.typingUsers.clear();
        this.chatInterface.classList.add('hidden');
        this.loginScreen.classList.remove('hidden');
        this.usernameInput.value = '';
        this.messageInput.value = '';
        this.messagesContainer.innerHTML = '';
        this.usersList.innerHTML = '';
        this.usernameInput.focus();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
