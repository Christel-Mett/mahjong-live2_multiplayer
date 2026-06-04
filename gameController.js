// gameController.js
const userManager = require('./userManager');
const dbInterface = require('./dbInterface');
const lobbyController = require('./lobbyController');
const activeGames = {}; 
const gameRooms = {};
const roomPoints = {};
const absentTimeouts = {}; // Speichert laufende Abwesend-Timer pro Spieler

function scheduleAbsent(io, names) {
    names.forEach(name => {
        // Alten Timer canceln falls noch einer läuft
        if (absentTimeouts[name]) {
            clearTimeout(absentTimeouts[name]);
        }
        absentTimeouts[name] = setTimeout(() => {
            delete absentTimeouts[name];
            const user = userManager.getUser(name);
            if (user && user.location === 'ingame') {
                userManager.updateLocation(name, 'absent');
                lobbyController.broadcastUserList(io);
            }
        }, 5 * 60 * 1000);
    });
}

module.exports = {
    handleJoinRoom: (socket, data) => {
        if (data.room) {

            // Authentifizierungsprüfung: Nur bekannte User dürfen beitreten
            const username = userManager.getUsernameBySocketId(socket.id);
            if (!username) {
                console.log(`Unbekannter Socket ${socket.id} versucht Raum ${data.room} beizutreten – abgewiesen.`);
                return;
            }

            socket.join(data.room);

            if (!gameRooms[data.room]) gameRooms[data.room] = new Set();
            gameRooms[data.room].add(socket.id);

            // Abwesend-Timer canceln falls ein neues Spiel beginnt
            if (absentTimeouts[username]) {
                clearTimeout(absentTimeouts[username]);
                delete absentTimeouts[username];
            }
            userManager.addUser(username, socket.id, 'ingame');

            console.log(`${username} ist Raum ${data.room} beigetreten.`);
        }
    },

handlePlayerMove: (socket, data) => {
    if (!data.room) return;
    const username = userManager.getUsernameBySocketId(socket.id);
    if (username && data.punkte !== undefined) {
        if (!roomPoints[data.room]) roomPoints[data.room] = {};
        roomPoints[data.room][username] = data.punkte;
    }
    socket.to(data.room).emit('opponentMove', {
        moves: data.moves,
        punkte: data.punkte
    });
},

handleGameFinished: (io, socket, data) => {
    const { room, finalPoints } = data;
    if (!room) return;

    if (!activeGames[room]) {
        activeGames[room] = { players: {} };
    }

    activeGames[room].players[socket.id] = { 
        name: data.name || data.user || "Spieler", 
        points: finalPoints,
        time: data.finalTime || 0,
        finished: true 
    };

    if (gameRooms[room]) gameRooms[room].delete(socket.id);

    socket.to(room).emit('gracePeriodStarted');

    // Server-Timer: nach 31s Scoreboard senden falls Spieler B nicht fertig wird
    if (!activeGames[room].graceTimeout) {
        activeGames[room].graceTimeout = setTimeout(() => {
            if (!activeGames[room]) return;
            const playersInRoom = Object.values(activeGames[room].players);

            // Unfertige Spieler mit 0 Punkten ergänzen
            if (gameRooms[room]) {
                for (const sid of gameRooms[room]) {
                    const name = userManager.getUsernameBySocketId(sid);
                    if (name && !playersInRoom.find(p => p.name === name)) {
                        const points = (roomPoints[room] && roomPoints[room][name]) ? roomPoints[room][name] : 0;
                        playersInRoom.push({ name, points });
                    }
                }
                delete gameRooms[room];
            }
            if (roomPoints[room]) delete roomPoints[room];

            playersInRoom.forEach(player => {
                if (player.name && player.points > 0) {
                    dbInterface.updateUserPoints(player.name, player.points, (err) => {
                        if (err) console.error(`Fehler beim Speichern der Punkte für ${player.name}:`, err);
                        else console.log(`${player.points} Punkte für ${player.name} gespeichert (Timer).`);
                    });
                }
            });
            io.to(room).emit('finalScoreboard', {
                scores: playersInRoom.map(p => ({ name: p.name, points: p.points, time: p.time || 0 }))
            });
            scheduleAbsent(io, playersInRoom.map(p => p.name).filter(Boolean));
            delete activeGames[room];
        }, 31000);
    }

    const playersInRoom = Object.values(activeGames[room].players);
    const verbliebeneSpieler = gameRooms[room] ? gameRooms[room].size : 0;
    if (playersInRoom.length >= 2 || verbliebeneSpieler === 0) {
        if (activeGames[room].graceTimeout) clearTimeout(activeGames[room].graceTimeout);
        playersInRoom.forEach(player => {
            if (player.name && player.points > 0) {
                dbInterface.updateUserPoints(player.name, player.points, (err) => {
                    if (err) console.error(`Fehler beim Speichern der Punkte für ${player.name}:`, err);
                    else console.log(`${player.points} Punkte für ${player.name} gespeichert.`);
                });
            }
        });
        io.to(room).emit('finalScoreboard', {
            scores: playersInRoom.map(p => ({ name: p.name, points: p.points, time: p.time || 0 }))
        });
        scheduleAbsent(io, playersInRoom.map(p => p.name).filter(Boolean));
        delete activeGames[room];
    }
},

cleanupPlayerGame: (io, socketId) => {
    for (const roomId in gameRooms) {
        if (gameRooms[roomId].has(socketId)) {
            gameRooms[roomId].delete(socketId);
            io.to(roomId).emit('gracePeriodStarted');
            console.log(`Leichen-Check: ${socketId} aus Raum ${roomId} entfernt.`);
            if (gameRooms[roomId].size === 0) {
                delete gameRooms[roomId];
                if (activeGames[roomId]) {
                    if (activeGames[roomId].graceTimeout) clearTimeout(activeGames[roomId].graceTimeout);
                    const playersInRoom = Object.values(activeGames[roomId].players);
                    playersInRoom.forEach(player => {
                        if (player.name && player.points > 0) {
                            dbInterface.updateUserPoints(player.name, player.points, (err) => {
                                if (err) console.error(`Fehler beim Speichern der Punkte für ${player.name}:`, err);
                                else console.log(`${player.points} Punkte für ${player.name} gespeichert (Leichen-Check).`);
                            });
                        }
                    });
                    delete activeGames[roomId];
                }
                console.log(`Leichen-Check: Raum ${roomId} vollständig bereinigt.`);
            }
            return;
        }
    }
},
	
	handleGracePeriodLeave: (socketId) => {
	    for (const roomId in activeGames) {
	        if (activeGames[roomId].players && activeGames[roomId].players[socketId]) {
	            const name = activeGames[roomId].players[socketId].name;
	            activeGames[roomId].players[socketId].points = 0;
	            console.log(`Grace-Period-Verlassen: Punkte für ${name} auf 0 gesetzt.`);
	            return;
	        }
	    }
	}
};