// Chat functionality for real-time messaging
class ChatManager {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentConversation = null;
        this.typingTimer = null;
        this.isTyping = false;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.connectToSocket();
    }

    initializeElements() {
        // Chat elements
        this.chatSidebar = document.getElementById('chatSidebar');
        this.chatMain = document.getElementById('chatMain');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInputContainer = document.getElementById('chatInputContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.chatStatus = document.getElementById('chatStatus');
        this.chatTitle = document.getElementById('chatTitle');
        this.onlineUsers = document.getElementById('onlineUsers');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.typingUser = document.getElementById('typingUser');
        this.noConversationSelected = document.getElementById('noConversationSelected');
        
        // User info elements
        this.userInfo = document.getElementById('userInfo');
        this.userName = document.getElementById('userName');
        this.userRole = document.getElementById('userRole');
        this.userAvatar = document.getElementById('userAvatar');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        // Admin elements
        this.conversationsList = document.getElementById('conversationsList');
        this.newConversationBtn = document.getElementById('newConversationBtn');
        this.newConversationModal = document.getElementById('newConversationModal');
        this.recipientSelect = document.getElementById('recipientSelect');
        this.startConversationBtn = document.getElementById('startConversationBtn');
        this.cancelNewConversationBtn = document.getElementById('cancelNewConversationBtn');
        this.closeNewConversationModal = document.getElementById('closeNewConversationModal');
    }

    initializeEventListeners() {
        // Message sending
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Typing indicators
        this.messageInput.addEventListener('input', () => this.handleTyping());

        // Admin conversation management
        if (this.newConversationBtn) {
            this.newConversationBtn.addEventListener('click', () => this.showNewConversationModal());
        }
        if (this.startConversationBtn) {
            this.startConversationBtn.addEventListener('click', () => this.startNewConversation());
        }
        if (this.cancelNewConversationBtn) {
            this.cancelNewConversationBtn.addEventListener('click', () => this.hideNewConversationModal());
        }
        if (this.closeNewConversationModal) {
            this.closeNewConversationModal.addEventListener('click', () => this.hideNewConversationModal());
        }

        // Logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    connectToSocket() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        this.socket = io({
            auth: {
                token: token
            }
        });

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Conectado al servidor de chat');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Desconectado del servidor de chat');
            this.updateConnectionStatus(false);
        });

        this.socket.on('user info', (userInfo) => {
            this.currentUser = userInfo;
            this.updateUserInterface();
        });

        this.socket.on('admin assigned', (data) => {
            this.currentConversation = data.conversationId;
            this.showChatInterface();
            this.loadMessages();
            this.updateChatTitle(`Chat con ${data.adminName}`);
        });

        this.socket.on('no admin available', () => {
            this.showNoAdminMessage();
        });

        this.socket.on('conversations loaded', (conversations) => {
            this.renderConversationsList(conversations);
        });

        this.socket.on('chat message', (message) => {
            if (message.conversationId === this.currentConversation) {
                this.displayMessage(message);
                this.scrollToBottom();
            }
        });

        this.socket.on('user typing', (data) => {
            if (data.conversationId === this.currentConversation) {
                this.showTypingIndicator(data);
            }
        });

        this.socket.on('new user assigned', (data) => {
            // Admin receives notification about new user
            console.log('Nuevo usuario asignado:', data);
        });

        this.socket.on('error', (error) => {
            this.showError(error.message);
        });
    }

    updateUserInterface() {
        if (this.currentUser) {
            // Show user info
            this.userInfo.style.display = 'flex';
            this.userName.textContent = this.currentUser.email.split('@')[0];
            this.userRole.textContent = this.currentUser.role === 'admin' ? 'Administrador' : 'Usuario';
            this.userAvatar.textContent = this.currentUser.email.charAt(0).toUpperCase();

            // Setup admin interface
            if (this.currentUser.role === 'admin') {
                this.setupAdminInterface();
            } else {
                this.setupUserInterface();
            }
        }
    }

    setupAdminInterface() {
        // Show sidebar and new conversation button
        this.chatSidebar.style.display = 'block';
        this.newConversationBtn.style.display = 'block';
        this.chatMain.classList.add('admin-layout');
        
        // Load conversations
        this.socket.emit('load conversations');
    }

    setupUserInterface() {
        // Hide sidebar for regular users
        this.chatSidebar.style.display = 'none';
        this.newConversationBtn.style.display = 'none';
        
        // User waits for admin assignment
        this.updateChatTitle('Esperando asignación de administrador...');
        this.onlineUsers.textContent = 'Conectando con soporte...';
    }

    showChatInterface() {
        this.chatMessages.style.display = 'flex';
        this.chatInputContainer.style.display = 'flex';
        this.noConversationSelected.style.display = 'none';
    }

    showNoAdminMessage() {
        this.chatMessages.style.display = 'none';
        this.chatInputContainer.style.display = 'none';
        this.noConversationSelected.style.display = 'block';
        this.noConversationSelected.innerHTML = '<p>No hay administradores disponibles en este momento. Por favor, intenta más tarde.</p>';
    }

    updateConnectionStatus(connected) {
        this.chatStatus.style.background = connected ? 'var(--color-success)' : 'var(--color-error)';
        this.chatStatus.title = connected ? 'Conectado' : 'Desconectado';
    }

    updateChatTitle(title) {
        this.chatTitle.textContent = title;
    }

    sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || !this.currentConversation) return;

        const messageData = {
            content: content,
            conversationId: this.currentConversation
        };

        // If admin is sending to a specific user, include recipientId
        if (this.currentUser.role === 'admin' && this.currentConversation) {
            const participants = this.currentConversation.split('_');
            const recipientId = participants.find(id => id !== this.currentUser.id);
            messageData.recipientId = recipientId;
        }

        this.socket.emit('chat message', messageData);
        this.messageInput.value = '';
        this.stopTyping();
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('user typing', {
                isTyping: true,
                conversationId: this.currentConversation
            });
        }

        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
            this.isTyping = false;
            this.socket.emit('user typing', {
                isTyping: false,
                conversationId: this.currentConversation
            });
        }, 1000);
    }

    stopTyping() {
        this.isTyping = false;
        clearTimeout(this.typingTimer);
        this.socket.emit('user typing', {
            isTyping: false,
            conversationId: this.currentConversation
        });
    }

    showTypingIndicator(data) {
        if (data.isTyping) {
            this.typingUser.textContent = data.userName;
            this.typingIndicator.style.display = 'block';
        } else {
            this.typingIndicator.style.display = 'none';
        }
    }

    displayMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.senderId === this.currentUser.id ? 'own' : ''}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-user">${message.senderName}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${this.escapeHtml(message.content)}</div>
        `;

        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    loadMessages() {
        if (this.currentConversation) {
            this.socket.emit('load messages', {
                conversationId: this.currentConversation
            });
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    renderConversationsList(conversations) {
        if (!this.conversationsList) return;

        this.conversationsList.innerHTML = '';

        conversations.forEach(conversation => {
            const conversationElement = document.createElement('div');
            conversationElement.className = 'conversation-item';
            if (conversation.conversationId === this.currentConversation) {
                conversationElement.classList.add('active');
            }

            const time = new Date(conversation.lastMessageTime).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            conversationElement.innerHTML = `
                <div class="conversation-avatar">${conversation.userName.charAt(0).toUpperCase()}</div>
                <div class="conversation-info">
                    <div class="conversation-name">${conversation.userName}</div>
                    <div class="conversation-preview">${this.escapeHtml(conversation.lastMessage)}</div>
                </div>
                <div class="conversation-time">${time}</div>
            `;

            conversationElement.addEventListener('click', () => {
                this.selectConversation(conversation);
            });

            this.conversationsList.appendChild(conversationElement);
        });
    }

    selectConversation(conversation) {
        this.currentConversation = conversation.conversationId;
        this.showChatInterface();
        this.updateChatTitle(`Chat con ${conversation.userName}`);
        this.loadMessages();
        
        // Update active state in conversation list
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
    }

    showNewConversationModal() {
        this.loadUsersForConversation();
        this.newConversationModal.classList.add('show');
    }

    hideNewConversationModal() {
        this.newConversationModal.classList.remove('show');
        this.recipientSelect.innerHTML = '<option value="">-- Selecciona un usuario --</option>';
    }

    async loadUsersForConversation() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateRecipientSelect(data.users);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        }
    }

    populateRecipientSelect(users) {
        this.recipientSelect.innerHTML = '<option value="">-- Selecciona un usuario --</option>';
        
        users.forEach(user => {
            if (user._id !== this.currentUser.id && user.role !== 'admin') {
                const option = document.createElement('option');
                option.value = user._id;
                option.textContent = `${user.email.split('@')[0]} (${user.email})`;
                this.recipientSelect.appendChild(option);
            }
        });
    }

    startNewConversation() {
        const recipientId = this.recipientSelect.value;
        if (!recipientId) {
            alert('Por favor selecciona un usuario');
            return;
        }

        this.currentConversation = this.generateConversationId(this.currentUser.id, recipientId);
        this.hideNewConversationModal();
        this.showChatInterface();
        this.updateChatTitle(`Chat con ${this.recipientSelect.selectedOptions[0].text.split(' (')[0]}`);
        this.loadMessages();
    }

    generateConversationId(userId1, userId2) {
        const sortedIds = [userId1, userId2].sort();
        return `${sortedIds[0]}_${sortedIds[1]}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        // Simple error display - you might want to use a more sophisticated notification system
        alert(`Error: ${message}`);
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatManager();
});