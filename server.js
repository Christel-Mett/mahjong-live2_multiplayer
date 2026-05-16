const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const dotenv = require('dotenv');
const nodemailer = require('nodemailer'); 
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

// Eigene Module laden
const dbInterface = require('./dbInterface');
const userManager = require('./userManager');
const authController = require('./authController');
const lobbyController = require('./lobbyController');
const authMiddleware = require('./auth');
const matchmaking = require('./matchmakingCore');
const gameController = require('./gameController');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Nodemailer Konfiguration
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: true, 
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

app.use(express.json());
app.set('trust proxy', 1);
app.use(cookieParser());

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'", 
                "https://www.google.com", 
                "https://www.gstatic.com",
                "https://cdnjs.cloudflare.com" 
            ],
            "script-src-attr": ["'unsafe-inline'"],
            "frame-src": ["'self'", "https://www.google.com"],
            "connect-src": ["'self'", "wss:", "ws:", "https:", "http:"],
            "img-src": ["'self'", "data:", "https:", "blob:"], 
            "style-src": ["'self'", "'unsafe-inline'"],
            "worker-src": ["'self'", "blob:"] 
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { 
        policy: "strict-origin-when-cross-origin" 
    },
    permissionsPolicy: {
        features: {
            camera: ["'none'"],
            microphone: ["'none'"],
            geolocation: ["'none'"],
            "interest-cohort": ["'none'"]
        },
    }
}));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 20, // max. 20 Versuche pro IP
    message: { success: false, message: 'Zu viele Anfragen. Bitte warte 15 Minuten.' }
});
const pageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 Minute
    max: 60, // max. 60 Seitenaufrufe pro IP
    message: { success: false, message: 'Zu viele Anfragen. Bitte kurz warten.' }
});
app.use('/set-session', loginLimiter);

// MySQL Store Konfiguration
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    clearExpired: true,
    checkExpirationInterval: 900000 // Alle 15 Min. abgelaufene Sessions löschen
});

const sessionMiddleware = session({
    key: 'mahjong_session',
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'mahjong_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true, // Nginx als Proxy, trust proxy ist gesetzt
        maxAge: 1000 * 60 * 60 * 24 // 1 Tag gültig
    }
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.get('/csrf-token', (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    req.session.csrfToken = token;
    res.json({ token });
});

function csrfProtection(req, res, next) {
    const token = req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
        return res.status(403).json({ success: false, message: 'CSRF-Token ungültig.' });
    }
    next();
}

// --- HTTP ROUTEN ---
app.get('/', pageLimiter, (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/verify', pageLimiter, authController.handleVerify);
app.get('/reset-password', pageLimiter, (req, res) => res.sendFile(__dirname + '/reset-password.html'));
app.get('/logout', pageLimiter, (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.post('/set-session', csrfProtection, (req, res) => {
    const username = req.body.username;
    const userId = req.body.userId || req.body.id || req.session.userId;

    if (username) {
        req.session.username = username;
        if (userId) req.session.userId = userId;

        req.session.save((err) => {
            if (err) return res.status(500).json({ success: false });
            console.log(`Session fixiert für: ${username} (ID: ${userId})`);
            res.json({ success: true });
        });
    } else {
        res.status(400).json({ success: false });
    }
});

app.get('/lobby', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/lobby.html'));
app.get('/lobby.html', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/lobby.html'));
app.get('/multi/', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/multi/index.html'));
app.get('/multi/index.html', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/multi/index.html'));
/*app.get('/single/', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/single/index.html'));
app.get('/single/index.html', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/single/index.html'));*/
app.get('/auswahl/lobby-auswahl.html', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/auswahl/lobby-auswahl.html'));
app.get('/auswahl/index.html', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/auswahl/index.html'));
app.get('/auswahl/', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/auswahl/index.html'));
//app.use(express.static(__dirname)); 
app.use('/auswahl', express.static(__dirname + '/auswahl'));
app.use('/multi', express.static(__dirname + '/multi'));
app.use('/single', express.static(__dirname + '/single'));
app.use('/shared', express.static(__dirname + '/shared'));
app.use('/style.css', express.static(__dirname + '/style.css'));

// --- SOCKET EVENTS ---
io.on('connection', (socket) => {
	 broadcastLayoutStats();
    const session = socket.request.session;
    console.log('Ein Client hat sich verbunden. ID:', socket.id);

    socket.on('register_attempt', (data) => authController.handleRegister(socket, data, transporter));
    socket.on('login_attempt', (data) => authController.handleLogin(socket, data, session));

    socket.on('forgot_password_attempt', (email) => authController.handleForgotPassword(socket, email, transporter));
    socket.on('reset_password_final', (data) => authController.handleResetFinal(socket, data));

    socket.on('join_lobby', () => {
        if (session.username) {
            lobbyController.handleLobbyJoin(socket, session.username);
        }
    });

    socket.on('send_chat_message', (text) => {
        lobbyController.handleChatMessage(io, socket, text);
    });
    
    socket.on('send_room_chat_message', (text) => {
    const username = userManager.getUsernameBySocketId(socket.id);
    if (!username) return;

    // Spielraum des Sockets ermitteln
    const gameRoom = [...socket.rooms].find(r => r.startsWith('room_'));
    if (!gameRoom) return;

    const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const messageData = { user: username, text: text, time: time };

    // Nachricht nur an den Spielraum senden
    io.to(gameRoom).emit('receive_room_chat_message', messageData);
});

    socket.on('get_leaderboard', () => {
        lobbyController.handleGetLeaderboard(socket);
    });
    
	socket.on('re-identify', (username) => {
	    if (!username) return;
	    console.log(`re-identify: ${username} (Socket: ${socket.id})`);
	    
	    const currentUser = userManager.getUser(username);
	    if (currentUser && currentUser.location === 'ingame') {
	        userManager.addUser(username, socket.id, 'ingame');
	        lobbyController.broadcastUserList(socket.server);
	    } else {
	        lobbyController.handleLobbyJoin(socket, username);
	    }
	});
	
	socket.on('reconnect_user', (data) => {
    const username = data.username;
    if (!username) return;

    dbInterface.getUsersByNames([username], (err, results) => {
        if (err || !results || results.length === 0) return;

        const userData = results[0];
        userManager.addUser(username, socket.id, 'lobby');

        socket.emit('login_response', {
            success: true,
            username: userData.username,
            points: userData.mp_points,
            rang: userData.rang
        });

        lobbyController.broadcastUserList(io);
    });
});
	 
    socket.on('join_queue', () => {
        const username = session.username;
        if (!username) return;

        dbInterface.getUsersByNames([username], (err, results) => {
            if (err || !results || results.length === 0) return;
            
            const userData = results[0];
            matchmaking.addToWaitingQueue({ 
                socket, 
                name: username, 
                rank: userData.rang, 
                points: userData.mp_points 
            });
            console.log(`${username} wartet auf Zufallsspiel.`);
        });
    });

    socket.on('join_layout_queue', ({layoutId}) => {
        const username = session.username;
        if (!username) return;

        dbInterface.getUsersByNames([username], (err, results) => {
            if (err || !results || results.length === 0) return;
            
            const userData = results[0];
            matchmaking.addToLayoutQueue({ 
                socket, 
                name: username, 
                rank: userData.rang, 
                points: userData.mp_points, 
                layoutId 
            });
            console.log(`${username} wartet auf Layout: ${layoutId}`);
        });
    });
    
    socket.on('cancel_layout_queue', () => {
	    matchmaking.removeFromQueues(socket.id);
	    broadcastLayoutStats();
	});
    
    socket.on('join_layout_room', (layoutId) => {
    socket.join(`layout_${layoutId}`);
    broadcastLayoutUserList(layoutId);
    broadcastLayoutStats();
	});
	
	socket.on('leave_layout_room', (layoutId) => {
	    socket.leave(`layout_${layoutId}`);
	    broadcastLayoutUserList(layoutId);
	    broadcastLayoutStats();
	});

    socket.on('joinRoom', (data) => {
    	  console.log('joinRoom empfangen:', data); // ← NEU
        gameController.handleJoinRoom(socket, data);
        lobbyController.broadcastUserList(io); // Aktualisiert die Lobby-Anzeige bei Spielstart
    });

    socket.on('playerMove', (data) => gameController.handlePlayerMove(socket, data));

    socket.on('gameFinished', (data) => {
        gameController.handleGameFinished(io, socket, data);
        lobbyController.broadcastUserList(io); // Aktualisiert die Lobby-Anzeige bei Spielende
    });

    socket.on('disconnect', () => {
        const username = userManager.getUsernameBySocketId(socket.id);
        if (username) {
        gameController.cleanupPlayerGame(io, socket.id);
        gameController.handleGracePeriodLeave(socket.id);
            setTimeout(() => {
                const currentUser = userManager.getUser(username);
                if (currentUser && currentUser.socketId === socket.id) {
                    userManager.removeUser(username);
                    lobbyController.broadcastUserList(io);
                    console.log(`${username} endgültig entfernt.`);
                }
            }, 5000);
        }
        broadcastLayoutStats();
    });
});

const alleLayouts = [
    'arrow', 'balance', 'bug', 'chip', 'eagle', 'enterprise', 'flowers', 'future', 'garden', 'glade',
    'helios', 'inner_circle', 'km', 'mesh', 'rocket', 'the_door', 'time_tunnel'
];

function broadcastLayoutStats() {
    const stats = {};
    alleLayouts.forEach(layoutId => {
        const roomName = `layout_${layoutId}`;
        const room = io.sockets.adapter.rooms.get(roomName);
        stats[layoutId] = room ? room.size : 0;
    });
    io.emit('layout_stats_update', stats);
}

function broadcastLayoutUserList(layoutId) {
    const roomName = `layout_${layoutId}`;
    const room = io.sockets.adapter.rooms.get(roomName);

    if (!room || room.size === 0) {
        io.to(roomName).emit('update_layout_userlist', []);
        return;
    }

    const usernames = Array.from(room)
        .map(id => userManager.getUsernameBySocketId(id))
        .filter(name => !!name);

    if (usernames.length === 0) {
        io.to(roomName).emit('update_layout_userlist', []);
        return;
    }

    dbInterface.getUsersByNames(usernames, (err, results) => {
        if (err) return;
        io.to(roomName).emit('update_layout_userlist', results);
    });
}

function startMultiplayerGame(p1, p2, layout) {
    const roomId = `room_${p1.socket.id}_${p2.socket.id}`;
    const seed = Math.floor(Math.random() * 1000000);
    const startTime = Date.now() + 2000;

    p1.socket.join(roomId);
    p2.socket.join(roomId);
    p1.socket.leave('lobby'); // ← neu
	 p2.socket.leave('lobby'); // ← neu

    p1.socket.emit('match_found', {
        room: roomId,
        layout: layout,
        seed: seed,
        opponent: p2.name,
        startTime: startTime
    });

    p2.socket.emit('match_found', {
        room: roomId,
        layout: layout,
        seed: seed,
        opponent: p1.name,
        startTime: startTime
    });

    console.log(`Match gefunden: ${p1.name} vs ${p2.name} in Raum ${roomId}`);
    
    // ✅ NEU: Diese zwei Zeilen hinzufügen
    userManager.updateLocation(p1.name, 'ingame');
    userManager.updateLocation(p2.name, 'ingame');    
    
    // Manuelles Update der Userliste für alle, da sich der Status geändert hat
    lobbyController.broadcastUserList(io);
}

setInterval(() => {
    const pair = matchmaking.findMatchInWaitingQueue();
    if (pair) startMultiplayerGame(pair[0], pair[1], matchmaking.getRandomLayout());
}, 2000);

setInterval(() => {
    const pair = matchmaking.findMatchInLayoutQueue();
    if (pair) {
        startMultiplayerGame(pair[0], pair[1], pair[0].layoutId || matchmaking.getRandomLayout());
        return;
    }
    const crossPair = matchmaking.findCrossQueueMatch();
    if (crossPair) {
        startMultiplayerGame(crossPair[0], crossPair[1], crossPair[0].layoutId || matchmaking.getRandomLayout());
    }
}, 2000);

// Einmaliger Aufruf beim Start
dbInterface.getMaxRang((err, results) => {
    if (!err && results && results.length > 0) {
        matchmaking.setGlobalMaxRang(results[0].max_rang);
    }
});

// Danach jede Minute wiederholen
setInterval(() => {
    dbInterface.getMaxRang((err, results) => {
        if (!err && results && results.length > 0) {
            matchmaking.setGlobalMaxRang(results[0].max_rang);
        }
    });
}, 60000);

const PORT = process.env.PORT || 3020;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
