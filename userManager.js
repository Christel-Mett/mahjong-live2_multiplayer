// userManager.js

// Die zentrale Speicherung: username -> { socketId, location, lastSeen }
const activeUsers = new Map(); 

module.exports = {
    // Fügt einen User hinzu oder aktualisiert Socket & Standort (z.B. bei Seitenwechsel)
    addUser: (username, socketId, location = 'lobby') => {
        activeUsers.set(username, {
            socketId: socketId,
            location: location,
            lastSeen: Date.now()
        });
    },

    // Aktualisiert nur den Standort (z.B. Wechsel von Lobby zu Spielraum)
    updateLocation: (username, location) => {
        if (activeUsers.has(username)) {
            const data = activeUsers.get(username);
            data.location = location;
            activeUsers.set(username, data);
        }
    },

    // Entfernt einen User endgültig (nach Ablauf des Puffers)[cite: 3]
    removeUser: (username) => {
        activeUsers.delete(username);
    },

    // Holt das komplette Datenobjekt eines Users
    getUser: (username) => {
        return activeUsers.get(username);
    },

    // Holt die Socket-ID eines Users
    getSocketId: (username) => {
        const user = activeUsers.get(username);
        return user ? user.socketId : null;
    },

    // Holt den Usernamen anhand einer Socket-ID (wichtig für disconnect-Events)[cite: 3]
    getUsernameBySocketId: (socketId) => {
        for (let [username, data] of activeUsers.entries()) {
            if (data.socketId === socketId) return username;
        }
        return null;
    },

    // Gibt alle Usernamen zurück, die sich an einem bestimmten Ort befinden (z.B. 'lobby')[cite: 3]
    getUsersAtLocation: (location) => {
        return Array.from(activeUsers.entries())
            .filter(([_, data]) => data.location === location)
            .map(([username, _]) => username);
    },

    // Liste für die User-Anzeige (Lobby) generieren[cite: 3, 4]
    getAllForDisplay: () => {
        return Array.from(activeUsers.entries()).map(([username, data]) => ({
            username: username,
            location: data.location
        }));
    }
};
