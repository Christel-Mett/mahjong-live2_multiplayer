// dbInterface.js
const mysql = require('mysql2');
require('dotenv').config();

console.log("DB-Verbindungsversuch mit User:", process.env.DB_USER);

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306 
});

db.connect(err => { 
    if (!err) console.log('Datenbank im dbInterface verbunden!');
    else console.error('Fehler bei Datenbankverbindung im dbInterface:', err);
});

module.exports = {
    // Verifizierung (aus app.get('/verify'))
    verifyUser: (token, callback) => {
        const sql = "UPDATE users SET is_verified = 1, token = NULL WHERE token = ?";
        db.query(sql, [token], callback);
    },

    // Registrierungs-Check (aus socket.on('register_attempt'))
    checkUserExists: (username, email, callback) => {
        const sql = 'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR email = ?';
        db.query(sql, [username, email], callback);
    },

    // User einfügen (aus socket.on('register_attempt'))
    insertUser: (username, password, email, token, callback) => {
        const sql = 'INSERT INTO users (username, password, email, mp_points, is_verified, token) VALUES (?, ?, ?, 0, 0, ?)';
        db.query(sql, [username, password, email, token], callback);
    },

    // Login-Suche (aus socket.on('login_attempt'))
    getUserByUsername: (username, callback) => {
        const sql = 'SELECT * FROM users WHERE LOWER(username) = LOWER(?)';
        db.query(sql, [username], callback);
    },

    // Zeitstempel-Update (aus socket.on('login_attempt'))
    updateLoginTimestamp: (userId, callback) => {
        const sql = "UPDATE users SET last_login = NOW(), deletion_warning_sent = NULL WHERE id = ?";
        db.query(sql, [userId], callback);
    },

    // Rang und Punkte eines Users (aus reconnect_user, join_queue, join_layout_queue)
    getUserRankAndPoints: (username, callback) => {
        const sql = "SELECT (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.mp_points > u1.mp_points) AS aktuellerRang, mp_points FROM users u1 WHERE username = ?";
        db.query(sql, [username], callback);
    },

    // Userliste für Lobby (aus broadcastUserList) - KORRIGIERT mit Sicherheitscheck
    getUsersByNames: (usernames, callback) => {
        if (!usernames || usernames.length === 0) {
            return callback(null, []);
        }
        const sql = "SELECT username, (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.mp_points > u1.mp_points) AS rang FROM users u1 WHERE username IN (?) ORDER BY mp_points DESC";
        db.query(sql, [usernames], callback);
    },

    // Globale Rangliste (aus socket.on('get_leaderboard'))
    getLeaderboard: (callback) => {
        const sql = "SELECT username, mp_points, (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.mp_points > u1.mp_points) AS rang FROM users u1 ORDER BY mp_points DESC";
        db.query(sql, callback);
    },
    
    // Höchsten Rang ermitteln (für Matchmaking-Priorität)
	 getMaxRang: (callback) => {
	     const sql = "SELECT COUNT(*) + 1 AS max_rang FROM users WHERE mp_points > (SELECT MIN(mp_points) FROM users)";
	     db.query(sql, callback);
	 },

    // Punkte-Update nach Spielende (aus beendeRaumEndgültig)
    updateUserPoints: (username, points, callback) => {
        const sql = "UPDATE users SET mp_points = mp_points + ? WHERE username = ?";
        db.query(sql, [points, username], callback);
    },

    // Hilfsfunktionen für Passwort-Reset
    getUserByEmail: (email, callback) => {
        db.query('SELECT id FROM users WHERE email = ?', [email], callback);
    },
    getUserByToken: (token, callback) => {
        db.query('SELECT id FROM users WHERE token = ?', [token], callback);
    },
    updateUserToken: (userId, token, callback) => {
        db.query('UPDATE users SET token = ? WHERE id = ?', [token, userId], callback);
    },
    updatePasswordAndClearToken: (userId, hashedPassword, callback) => {
        db.query('UPDATE users SET password = ?, token = NULL WHERE id = ?', [hashedPassword, userId], callback);
    }
};