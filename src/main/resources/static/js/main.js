let stompClient = null;
let currentUser = null;
let currentRoom = null;
let onlineUsers = new Set();
let typingTimeout = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const DOM = {
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    registerUsername: document.getElementById('registerUsername'),
    registerPassword: document.getElementById('registerPassword'),
    registerConfirmPassword: document.getElementById('registerConfirmPassword'),
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    loginMessage: document.getElementById('loginMessage'),
    registerMessage: document.getElementById('registerMessage'),

    createRoomBtn: document.getElementById('createRoomBtn'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),
    roomNameInput: document.getElementById('roomName'),
    joinRoomCodeInput: document.getElementById('joinRoomCode'),
    roomsList: document.getElementById('roomsList'),
    roomCodeDisplay: document.getElementById('roomCodeDisplay'),
    roomCodeElement: document.getElementById('roomCode'),
    copyCodeBtn: document.getElementById('copyCodeBtn'),
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),

    messageArea: document.getElementById('messageArea'),
    messageForm: document.getElementById('messageForm'),
    messageInput: document.getElementById('message'),
    sendBtn: document.getElementById('sendBtn'),
    usersList: document.getElementById('usersList'),
    typingIndicator: document.getElementById('typingIndicator'),
    connectingElement: document.getElementById('connecting'),
    noMessages: document.getElementById('noMessages'),

    usernameDisplay: document.getElementById('usernameDisplay'),
    roomNameDisplay: document.getElementById('roomNameDisplay'),
    roomCodeDisplay: document.getElementById('roomCodeDisplay'),
    userCount: document.getElementById('userCount'),
    messageCount: document.getElementById('messageCount'),
    currentUserAvatar: document.getElementById('currentUserAvatar'),

    loginPage: document.getElementById('login-page'),
    roomsPage: document.getElementById('rooms-page'),
    chatPage: document.getElementById('chat-page'),
    usernamePage: document.getElementById('username-page'),
    whiteboardPage: document.getElementById('whiteboard-page')
};

function showMessage(elementId, text, type) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = text;
    element.className = `message ${type}`;

    if (type === 'success') {
        setTimeout(() => {
            element.className = 'message';
        }, 3000);
    }
}
function setLoading(button, isLoading, loadingText = 'Loading...') {
    if (!button) return;

    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.textContent = button.dataset.originalText || button.textContent;
        button.disabled = false;
        button.classList.remove('loading');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    const validations = {
        minLength: password.length >= 6,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const isValid = Object.values(validations).filter(v => v).length >= 3;
    const messages = [];

    if (!validations.minLength) messages.push('at least 6 characters');
    if (!validations.hasUpperCase) messages.push('one uppercase letter');
    if (!validations.hasLowerCase) messages.push('one lowercase letter');
    if (!validations.hasNumber) messages.push('one number');
    if (!validations.hasSpecialChar) messages.push('one special character');

    return {
        isValid,
        messages,
        score: Object.values(validations).filter(v => v).length
    };
}
function getAvatarColor(username) {
    const colors = [
        '#667eea', '#764ba2', '#48bb78', '#ed8936',
        '#f56565', '#38b2ac', '#ed64a6', '#9f7aea'
    ];

    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash % colors.length);
    return colors[index];
}

function formatTime(timestamp) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);

        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
async function handleLogin(event) {
    event.preventDefault();

    const username = DOM.loginUsername.value.trim();
    const password = DOM.loginPassword.value.trim();

    if (!username || !password) {
        showMessage('loginMessage', 'Please fill in all fields', 'error');
        return;
    }

    setLoading(DOM.loginBtn, true, 'Signing in...');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('username', username);
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('authToken', data.token || '');

            window.location.href = 'rooms.html';
        } else {
            showMessage('loginMessage', data.message || 'Invalid credentials', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('loginMessage', 'Network error. Please try again.', 'error');
    } finally {
        setLoading(DOM.loginBtn, false);
    }
}
async function handleRegister(event) {
    event.preventDefault();

    const username = DOM.registerUsername.value.trim();
    const password = DOM.registerPassword.value.trim();
    const confirmPassword = DOM.registerConfirmPassword.value.trim();

    if (!username || !password || !confirmPassword) {
        showMessage('registerMessage', 'Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('registerMessage', 'Passwords do not match', 'error');
        return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        showMessage('registerMessage',
            `Password must have at least 3 of: ${passwordValidation.messages.join(', ')}`,
            'error'
        );
        return;
    }

    if (username.length < 3) {
        showMessage('registerMessage', 'Username must be at least 3 characters', 'error');
        return;
    }

    setLoading(DOM.registerBtn, true, 'Creating account...');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('registerMessage', 'Account created successfully! Please sign in.', 'success');

            setTimeout(() => {
                DOM.registerForm.reset();
                if (DOM.loginForm) {
                    DOM.loginUsername.value = username;
                    DOM.loginPassword.focus();
                }
                if (typeof showTab === 'function') {
                    showTab('login');
                }
            }, 2000);
        } else {
            showMessage('registerMessage', data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('registerMessage', 'Network error. Please try again.', 'error');
    } finally {
        setLoading(DOM.registerBtn, false);
    }
}

function checkAuthentication() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const username = localStorage.getItem('username');

    if (!isAuthenticated || !username) {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('username');
        localStorage.removeItem('authToken');
        return false;
    }

    currentUser = username;
    return true;
}

function handleLogout() {
    if (stompClient && stompClient.connected && currentRoom) {
        stompClient.send("/app/chat.leaveRoom", {}, JSON.stringify({
            sender: currentUser,
            type: 'LEAVE'
        }));
        stompClient.disconnect();
    }

    localStorage.clear();
    sessionStorage.clear();

    stompClient = null;
    currentUser = null;
    currentRoom = null;
    onlineUsers.clear();

    window.location.href = 'login.html';
}

async function loadActiveRooms() {
    if (!DOM.roomsList) return;

    const loadingElement = document.getElementById('roomsLoading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }

    try {
        const response = await fetch('/api/rooms/list');
        if (!response.ok) throw new Error('Failed to load rooms');

        const rooms = await response.json();

        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        if (rooms.length === 0) {
            DOM.roomsList.innerHTML = `
                <div class="empty-state">
                    <div>📭</div>
                    <p>No active rooms yet. Create the first one!</p>
                </div>
            `;
            return;
        }

        DOM.roomsList.innerHTML = '';
        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.innerHTML = `
                <div class="room-icon">💬</div>
                <div class="room-info">
                    <div class="room-name">${room.roomName}</div>
                    <div class="room-meta">
                        <span>Created by: ${room.createdBy}</span>
                        <span class="room-code">${room.roomCode}</span>
                    </div>
                </div>
            `;

            roomElement.addEventListener('click', () => {
                document.querySelectorAll('.room-item').forEach(item => {
                    item.classList.remove('active');
                });
                roomElement.classList.add('active');

                if (DOM.joinRoomCodeInput) {
                    DOM.joinRoomCodeInput.value = room.roomCode;
                }
            });

            DOM.roomsList.appendChild(roomElement);
        });
    } catch (error) {
        console.error('Error loading rooms:', error);
        if (loadingElement) {
            loadingElement.innerHTML = '<div class="error">Failed to load rooms. Please refresh.</div>';
        }
    }
}

async function createRoom() {
    if (!DOM.roomNameInput || !DOM.createRoomBtn) return;

    const roomName = DOM.roomNameInput.value.trim();
    const btn = DOM.createRoomBtn;

    if (!roomName) {
        showMessage('createRoomMessage', 'Please enter a room name', 'error');
        return;
    }

    setLoading(btn, true, 'Creating room...');

    try {
        const response = await fetch('/api/rooms/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomName: roomName,
                createdBy: currentUser
            })
        });

        const data = await response.json();

        if (data.success) {
            if (DOM.roomCodeElement) {
                DOM.roomCodeElement.textContent = data.roomCode;
            }
            if (DOM.roomCodeDisplay) {
                DOM.roomCodeDisplay.classList.add('active');
            }

            window.currentRoomCode = data.roomCode;
            window.currentRoomName = data.roomName;

            showMessage('createRoomMessage', 'Room created successfully!', 'success');
            DOM.roomNameInput.value = '';

            await loadActiveRooms();
        } else {
            showMessage('createRoomMessage', data.message || 'Failed to create room', 'error');
        }
    } catch (error) {
        console.error('Create room error:', error);
        showMessage('createRoomMessage', 'Network error. Please try again.', 'error');
    } finally {
        setLoading(btn, false);
    }
}


async function joinRoom(roomCode = null) {
    const code = roomCode || (DOM.joinRoomCodeInput ? DOM.joinRoomCodeInput.value.trim().toUpperCase() : '');
    const btn = DOM.joinRoomBtn;

    if (!code) {
        showMessage('joinRoomMessage', 'Please enter a room code', 'error');
        return;
    }

    setLoading(btn, true, 'Joining room...');

    try {
        const response = await fetch('/api/rooms/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ roomCode: code })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('currentRoomCode', code);
            localStorage.setItem('currentRoomName', data.roomName || `Room ${code}`);

            window.location.href = `chat.html?room=${code}`;
        } else {
            showMessage('joinRoomMessage', data.message || 'Invalid room code', 'error');
        }
    } catch (error) {
        console.error('Join room error:', error);
        showMessage('joinRoomMessage', 'Network error. Please try again.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

async function copyRoomCode() {
    if (!DOM.roomCodeElement) return;

    const code = DOM.roomCodeElement.textContent;
    if (!code) return;

    const success = await copyToClipboard(code);
    if (success && DOM.copyCodeBtn) {
        const btn = DOM.copyCodeBtn;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('success');

        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('success');
        }, 2000);
    }
}

function connectWebSocket() {
    if (!currentRoom || !currentUser) {
        console.error('Cannot connect: missing room or user');
        return;
    }

    if (DOM.connectingElement) {
        DOM.connectingElement.classList.add('active');
    }

    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);

    stompClient.reconnect_delay = 5000;
    stompClient.heartbeat.outgoing = 10000;
    stompClient.heartbeat.incoming = 10000;

    stompClient.connect({}, function(frame) {
        console.log('WebSocket Connected:', frame);
        reconnectAttempts = 0;

        if (DOM.connectingElement) {
            DOM.connectingElement.classList.remove('active');
        }

        const subscription = stompClient.subscribe(`/topic/room/${currentRoom}`, onMessageReceived);

        window.currentSubscription = subscription;

        stompClient.send("/app/chat.joinRoom", {}, JSON.stringify({
            sender: currentUser,
            content: currentRoom,
            type: 'JOIN'
        }));

        loadChatHistory();

        startPingInterval();

    }, function(error) {
        console.error('WebSocket connection error:', error);
        reconnectAttempts++;

        if (DOM.connectingElement) {
            DOM.connectingElement.textContent = `Connection failed${reconnectAttempts > 1 ? ` (Attempt ${reconnectAttempts})` : ''}. Reconnecting...`;
        }

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            setTimeout(connectWebSocket, 3000 * reconnectAttempts);
        } else {
            if (DOM.connectingElement) {
                DOM.connectingElement.textContent = 'Connection failed. Please refresh the page.';
                DOM.connectingElement.classList.add('error');
            }
        }
    });
}

function disconnectWebSocket() {
    if (stompClient) {
        if (stompClient.connected && currentRoom && currentUser) {
            stompClient.send("/app/chat.leaveRoom", {}, JSON.stringify({
                sender: currentUser,
                type: 'LEAVE'
            }));
        }

        if (window.currentSubscription) {
            window.currentSubscription.unsubscribe();
        }

        stompClient.disconnect();
        stompClient = null;
    }

    if (window.pingInterval) {
        clearInterval(window.pingInterval);
        window.pingInterval = null;
    }
}

function startPingInterval() {
    if (window.pingInterval) {
        clearInterval(window.pingInterval);
    }

    window.pingInterval = setInterval(() => {
        if (stompClient && stompClient.connected) {
            stompClient.send("/app/chat.ping", {}, JSON.stringify({
                sender: currentUser,
                type: 'PING',
                timestamp: new Date().toISOString()
            }));
        }
    }, 30000); // Ping every 30 seconds
}

function onMessageReceived(payload) {
    try {
        const message = JSON.parse(payload.body);

        switch (message.type) {
            case 'JOIN':
                handleUserJoin(message.sender);
                displayMessage(message);
                break;

            case 'LEAVE':
                handleUserLeave(message.sender);
                displayMessage(message);
                break;

            case 'CHAT':
                if (DOM.noMessages) {
                    DOM.noMessages.style.display = 'none';
                }
                displayMessage(message);
                scrollToBottom();
                break;

            case 'TYPING':
                if (message.sender !== currentUser) {
                    showTypingIndicator(message.sender);
                }
                break;

            case 'TYPING_END':
                hideTypingIndicator();
                break;

            case 'PING':
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    } catch (error) {
        console.error('Error parsing message:', error, payload);
    }
}

function sendMessage(event) {
    event.preventDefault();

    if (!stompClient || !stompClient.connected) {
        showMessage('chatMessage', 'Not connected to chat server', 'error');
        return;
    }

    const messageContent = DOM.messageInput ? DOM.messageInput.value.trim() : '';
    if (!messageContent) return;

    const chatMessage = {
        sender: currentUser,
        content: messageContent,
        type: 'CHAT'
    };

    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));

    if (DOM.messageInput) {
        DOM.messageInput.value = '';
        DOM.messageInput.focus();
    }

    clearTypingIndicator();
}

function handleTyping() {
    if (!stompClient || !stompClient.connected || !currentRoom) return;

    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    stompClient.send("/app/chat.typing", {}, JSON.stringify({
        sender: currentUser,
        type: 'TYPING',
        content: currentRoom
    }));
    typingTimeout = setTimeout(clearTypingIndicator, 1000);
}

function clearTypingIndicator() {
    if (stompClient && stompClient.connected && currentRoom) {
        stompClient.send("/app/chat.typing", {}, JSON.stringify({
            sender: currentUser,
            type: 'TYPING_END',
            content: currentRoom
        }));
    }

    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }

    hideTypingIndicator();
}
function showTypingIndicator(username) {
    if (!DOM.typingIndicator) return;

    DOM.typingIndicator.textContent = `${username} is typing...`;
    DOM.typingIndicator.classList.add('active');

    if (window.typingIndicatorTimeout) {
        clearTimeout(window.typingIndicatorTimeout);
    }

    window.typingIndicatorTimeout = setTimeout(hideTypingIndicator, 3000);
}
function hideTypingIndicator() {
    if (!DOM.typingIndicator) return;

    DOM.typingIndicator.classList.remove('active');
    DOM.typingIndicator.textContent = '';
}
async function loadChatHistory() {
    if (!currentRoom) return;

    try {
        const response = await fetch(`/api/messages/history/${currentRoom}`);
        if (!response.ok) throw new Error('Failed to load history');

        const messages = await response.json();

        if (messages.length > 0 && DOM.noMessages) {
            DOM.noMessages.style.display = 'none';
        }

        if (DOM.messageArea) {
            DOM.messageArea.innerHTML = '';

            messages.forEach(message => {
                displayMessage(message);
            });

            scrollToBottom();
        }

        if (DOM.messageCount) {
            DOM.messageCount.textContent = messages.length;
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        if (DOM.noMessages) {
            DOM.noMessages.innerHTML = `
                <div class="error">
                    <p>Failed to load messages</p>
                    <button onclick="loadChatHistory()" class="btn btn-sm btn-outline">Retry</button>
                </div>
            `;
        }
    }
}

function displayMessage(message) {
    if (!DOM.messageArea) return;

    const li = document.createElement('li');
    li.className = 'message';

    const isCurrentUser = message.sender === currentUser;
    const isEvent = message.type === 'JOIN' || message.type === 'LEAVE';

    if (isEvent) {
        li.className = 'message event';
        li.innerHTML = `
            <div class="message-content">${message.content || `${message.sender} ${message.type === 'JOIN' ? 'joined' : 'left'} the room`}</div>
        `;
    } else {
        li.className = isCurrentUser ? 'message sent' : 'message received';

        const avatarColor = getAvatarColor(message.sender);
        const avatarLetter = message.sender.charAt(0).toUpperCase();

        const timestamp = message.timestamp ? formatTime(message.timestamp) : formatTime(new Date());

        li.innerHTML = `
            <div class="message-header">
                <div class="message-sender-info">
                    <div class="avatar avatar-sm" style="background-color: ${avatarColor}">${avatarLetter}</div>
                    <span class="message-sender">${message.sender}</span>
                </div>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">${escapeHtml(message.content || '')}</div>
        `;
    }

    DOM.messageArea.appendChild(li);

    if (!isEvent && DOM.messageCount) {
        const count = document.querySelectorAll('.message:not(.event)').length;
        DOM.messageCount.textContent = count;
    }
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function handleUserJoin(username) {
    onlineUsers.add(username);
    updateUserList();
}

function handleUserLeave(username) {
    onlineUsers.delete(username);
    updateUserList();
}

function updateUserList() {
    if (!DOM.usersList) return;

    DOM.usersList.innerHTML = '';
    const currentUserItem = document.createElement('div');
    currentUserItem.className = 'user-item active';
    currentUserItem.innerHTML = `
        <div class="user-avatar" style="background-color: ${getAvatarColor(currentUser)}">
            ${currentUser.charAt(0).toUpperCase()}
        </div>
        <div class="user-info">
            <div class="user-name">You</div>
            <div class="user-status online">Online</div>
        </div>
        <div class="status-dot online"></div>
    `;
    DOM.usersList.appendChild(currentUserItem);

    onlineUsers.forEach(user => {
        if (user !== currentUser) {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-avatar" style="background-color: ${getAvatarColor(user)}">
                    ${user.charAt(0).toUpperCase()}
                </div>
                <div class="user-info">
                    <div class="user-name">${user}</div>
                    <div class="user-status online">Online</div>
                </div>
                <div class="status-dot online"></div>
            `;
            DOM.usersList.appendChild(userItem);
        }
    });

    if (DOM.userCount) {
        DOM.userCount.textContent = `${onlineUsers.size} user${onlineUsers.size !== 1 ? 's' : ''} online`;
    }
}

function leaveRoom() {
    if (confirm('Are you sure you want to leave this room?')) {
        disconnectWebSocket();

        localStorage.removeItem('currentRoomCode');
        localStorage.removeItem('currentRoomName');

        window.location.href = 'rooms.html';
    }
}
function scrollToBottom() {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}
function initLoginPage() {
    if (checkAuthentication()) {
        window.location.href = 'rooms.html';
        return;
    }

    if (DOM.loginForm) {
        DOM.loginForm.addEventListener('submit', handleLogin);
    }

    if (DOM.registerForm) {
        DOM.registerForm.addEventListener('submit', handleRegister);
    }

    if (DOM.registerPassword) {
        DOM.registerPassword.addEventListener('input', debounce(function() {
            const password = this.value;
            if (password.length > 0) {
                const validation = validatePassword(password);
            }
        }, 300));
    }

    if (DOM.loginUsername) {
        DOM.loginUsername.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && DOM.loginPassword) {
                DOM.loginPassword.focus();
            }
        });
    }

    if (DOM.loginPassword) {
        DOM.loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                DOM.loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }
}

function initRoomsPage() {
    if (!checkAuthentication()) {
        window.location.href = 'login.html';
        return;
    }

    if (DOM.usernameDisplay) {
        DOM.usernameDisplay.textContent = currentUser;
    }

    if (DOM.createRoomBtn) {
        DOM.createRoomBtn.addEventListener('click', createRoom);
    }

    if (DOM.joinRoomBtn) {
        DOM.joinRoomBtn.addEventListener('click', () => joinRoom());
    }

    if (DOM.copyCodeBtn) {
        DOM.copyCodeBtn.addEventListener('click', copyRoomCode);
    }

    if (DOM.roomNameInput) {
        DOM.roomNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createRoom();
            }
        });
    }

    if (DOM.joinRoomCodeInput) {
        DOM.joinRoomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinRoom();
            }
        });
    }

    const joinCreatedRoomBtn = document.getElementById('joinCreatedRoomBtn');
    if (joinCreatedRoomBtn) {
        joinCreatedRoomBtn.addEventListener('click', () => {
            if (window.currentRoomCode) {
                joinRoom(window.currentRoomCode);
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function initChatPage() {
    if (!checkAuthentication()) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room') || localStorage.getItem('currentRoomCode');

    if (!roomCode) {
        window.location.href = 'rooms.html';
        return;
    }

    currentRoom = roomCode;
    const roomName = localStorage.getItem('currentRoomName') || `Room ${roomCode}`;

    if (DOM.usernameDisplay) {
        DOM.usernameDisplay.textContent = currentUser;
    }

    if (DOM.currentUserAvatar) {
        DOM.currentUserAvatar.textContent = currentUser.charAt(0).toUpperCase();
        DOM.currentUserAvatar.style.backgroundColor = getAvatarColor(currentUser);
    }

    if (DOM.roomNameDisplay) {
        DOM.roomNameDisplay.textContent = roomName;
    }

    if (DOM.roomCodeDisplay) {
        DOM.roomCodeDisplay.textContent = roomCode;
    }

    if (DOM.messageForm) {
        DOM.messageForm.addEventListener('submit', sendMessage);
    }

    if (DOM.messageInput) {
        DOM.messageInput.addEventListener('input', debounce(handleTyping, 300));
        DOM.messageInput.focus();
    }

    if (DOM.leaveRoomBtn) {
        DOM.leaveRoomBtn.addEventListener('click', leaveRoom);
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter' && DOM.messageInput && DOM.messageInput.value.trim()) {
            sendMessage(new Event('submit'));
        }

        if (e.key === 'Escape') {
            leaveRoom();
        }

        if (e.key === '/' && DOM.messageInput) {
            e.preventDefault();
            DOM.messageInput.focus();
        }
    });
    if (DOM.messageInput) {
        DOM.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (DOM.messageForm) {
                    DOM.messageForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    connectWebSocket();
    window.addEventListener('beforeunload', () => {
        if (stompClient && stompClient.connected) {
            stompClient.send("/app/chat.leaveRoom", {}, JSON.stringify({
                sender: currentUser,
                type: 'LEAVE'
            }));
        }
    });
}
function initPage() {
    const path = window.location.pathname;

    if (window.pingInterval) {
        clearInterval(window.pingInterval);
    }

    if (window.typingIndicatorTimeout) {
        clearTimeout(window.typingIndicatorTimeout);
    }

    if (path.includes('login.html') || path === '/') {
        initLoginPage();
    } else if (path.includes('rooms.html')) {
        initRoomsPage();
    } else if (path.includes('chat.html')) {
        initChatPage();
    } else {
        if (!checkAuthentication()) {
            window.location.href = 'login.html';
        }
    }
}

window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', { message, source, lineno, colno, error });

    if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
        return false;
    }

    showMessage('globalError', 'An unexpected error occurred. Please try again.', 'error');
    return false;
};

window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
};
document.addEventListener('DOMContentLoaded', function() {
    initPage();

    if (!document.getElementById('globalError')) {
        const errorContainer = document.createElement('div');
        errorContainer.id = 'globalError';
        errorContainer.className = 'message';
        errorContainer.style.position = 'fixed';
        errorContainer.style.top = '20px';
        errorContainer.style.right = '20px';
        errorContainer.style.zIndex = '9999';
        errorContainer.style.maxWidth = '300px';
        document.body.appendChild(errorContainer);
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    }
});

window.showTab = function(tabName) {
    if (typeof window.showTabImplementation === 'function') {
        window.showTabImplementation(tabName);
    }
};

window.loadChatHistory = loadChatHistory;
window.leaveRoom = leaveRoom;
window.copyRoomCode = copyRoomCode;