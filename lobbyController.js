// lobbyController.js
const dbInterface = require('./dbInterface');
const userManager = require('./userManager');

// Speichert laufende Abwesend-Timer pro Lobby-User
const lobbyAbsentTimeouts = {};

function scheduleLobbyAbsent(io, username) {
	
   // Falls User aktuell als abwesend markiert ist, durch neue Aktivität zurücksetzen
   const currentUser = userManager.getUser(username);
   if (currentUser && currentUser.location === 'absent') {
       userManager.updateLocation(username, 'lobby');
       module.exports.broadcastUserList(io);
   }	
	
    if (lobbyAbsentTimeouts[username]) {
        clearTimeout(lobbyAbsentTimeouts[username]);
    }
    lobbyAbsentTimeouts[username] = setTimeout(() => {
        delete lobbyAbsentTimeouts[username];
        const user = userManager.getUser(username);
        if (user && user.location === 'lobby') {
            userManager.updateLocation(username, 'absent');
            module.exports.broadcastUserList(io);
        }
    }, 5 * 60 * 1000);

}

// Speicher für die letzten 50 Nachrichten (Chat-History)
let chatHistory = [];

module.exports = {
    // Wird aufgerufen, wenn ein User die Lobby betritt oder die Seite lädt
    handleLobbyJoin: (socket, username) => {
        // 1. User im Manager aktualisieren/bestätigen
        userManager.addUser(username, socket.id, 'lobby');
        
        // 2. Lobby-Raum beitreten
	     socket.join('lobby');
	     console.log(`${username} hat die Lobby betreten.`);

        // Abwesend-Timer für die Lobby starten
 	     scheduleLobbyAbsent(socket.server, username);

        // 3. Chat-Verlauf an den neuen User senden
        socket.emit('chat_history', chatHistory);

        // 4. Aktuelle Userliste an ALLE senden (Nutzt die unten definierte Funktion)
        module.exports.broadcastUserList(socket.server);
    },

    // Verarbeitet eingehende Chat-Nachrichten
    handleChatMessage: (io, socket, text) => {
        const username = userManager.getUsernameBySocketId(socket.id);
        if (!username) return;
        
        // Chat zählt als Aktivität -> Abwesend-Timer zurücksetzen
        scheduleLobbyAbsent(io, username);

        const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const messageData = {
            user: username,
            text: text,
            time: time
        };

        // History aktualisieren (max 50 Einträge)
        chatHistory.push(messageData);
        if (chatHistory.length > 50) chatHistory.shift();

			// Nachricht nur an Lobby senden
			io.to('lobby').emit('receive_chat_message', messageData);
    },
    
        // Wird bei Klick-/Tastatur-Aktivität in der Lobby aufgerufen
    handleLobbyActivity: (io, socket) => {
        const username = userManager.getUsernameBySocketId(socket.id);
        if (username) {
            scheduleLobbyAbsent(io, username);
        }
    },

    // Sendet die aktuelle Liste der Online-User inkl. Status an alle
    broadcastUserList: (io) => {
        // 1. Alle User (Lobby & Ingame) aus dem userManager holen
        const users = userManager.getAllForDisplay(); 
        const usernames = users.map(u => u.username);

        // 2. Ränge aus der Datenbank abfragen
        dbInterface.getUsersByNames(usernames, (err, results) => {
            if (err) return console.error("Fehler beim Laden der User-Daten für Lobby:", err);

            // 3. Daten für das Frontend aufbereiten
            const displayData = users.map(u => {
                const dbData = results.find(r => r.username === u.username);
                return {
                    username: u.username,
                    rang: dbData ? dbData.rang : 'Gast',
                    // Korrekte Zuweisung für dein Frontend (lobby.html)
                    ingame: u.location === 'ingame',
                    searching: u.location === 'searching',
                    absent: u.location === 'absent'
                };
            });

            // 4. Liste an alle Clients senden
            io.emit('update_user_list', displayData);
        });
    },

    // Holt das Leaderboard für die Anzeige in der Lobby
    handleGetLeaderboard: (socket) => {
        dbInterface.getLeaderboard((err, results) => {
            if (err) return console.error("Fehler beim Leaderboard-Abruf:", err);
            socket.emit('leaderboard_data', results);
        });
    }
};