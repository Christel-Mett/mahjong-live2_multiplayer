/**
 * matchmakingCore.js
 * Vollständige Logik für Zufalls- und Layout-Matchmaking
 */

let waitingQueue = [];
let layoutQueue = [];
let globalMaxRang = 100; // Standardwert bis zur ersten DB-Abfrage

function setGlobalMaxRang(value) {
    if (value && value > 0) globalMaxRang = value;
}

let bypassMatchmaking = true; // true = stufenloses Matching aktiv

function setBypassMatchmaking(value) {
    bypassMatchmaking = value;
}

const MAX_RANK_DIFF = 20;

const meineLayouts = [
    'arrow', 'balance', 'bug', 'chip', 'eagle', 'enterprise', 'flowers', 'future', 'garden', 'glade', 
    'helios', 'inner_circle', 'km', 'mesh', 'rocket', 'the_door', 'time_tunnel'
];

function addToWaitingQueue(player) {
    waitingQueue = waitingQueue.filter(p => p.socket.id !== player.socket.id);
    waitingQueue.push({
        socket: player.socket,
        name: player.name,
        rank: player.rank,
        points: player.points,
        startTime: Date.now()
    });
}

function addToLayoutQueue(player) {
    layoutQueue = layoutQueue.filter(p => p.socket.id !== player.socket.id);
    layoutQueue.push({
        socket: player.socket,
        name: player.name,
        rank: player.rank,
        points: player.points,
        layoutId: player.layoutId,
        startTime: Date.now()
    });
}

function removeFromQueues(socketId) {
    waitingQueue = waitingQueue.filter(p => p.socket.id !== socketId);
    layoutQueue = layoutQueue.filter(p => p.socket.id !== socketId);
}

function getRandomLayout() {
    return meineLayouts[Math.floor(Math.random() * meineLayouts.length)];
}

/**
 * Logik für die Zufalls-Queue (Phase: Rang-Differenz oder >30s)
 *[cite: 1, 2]
 */
function findMatchInWaitingQueue() {
    if (waitingQueue.length < 2) return null;

    const lowRankLimit = globalMaxRang * 0.9;
    const jetzt = Date.now();

    for (let i = 0; i < waitingQueue.length; i++) {
        for (let j = i + 1; j < waitingQueue.length; j++) {
            const p1 = waitingQueue[i];
            const p2 = waitingQueue[j];

            if (p1.name === p2.name) {
                waitingQueue.splice(i, 1);
                return findMatchInWaitingQueue();
            }

				if (bypassMatchmaking) {
				    const pair = [waitingQueue[i], waitingQueue[j]];
				    waitingQueue.splice(j, 1);
				    waitingQueue.splice(i, 1);
				    return pair;
				}

            const diff = Math.abs(p1.rank - p2.rank);
            const wartedauerP1 = jetzt - p1.startTime;
            const wartedauerP2 = jetzt - p2.startTime;
            const isPriorityMatch = p1.rank >= lowRankLimit || p2.rank >= lowRankLimit;

            if (isPriorityMatch || diff <= MAX_RANK_DIFF || wartedauerP1 > 30000 || wartedauerP2 > 30000) {
                const pair = [waitingQueue[i], waitingQueue[j]];
                waitingQueue.splice(j, 1);
                waitingQueue.splice(i, 1);
                return pair;
            }
        }
    }
    return null;
}

/**
 * Logik für die Layout-Queue (3-Phasen-Check)
 * Mit Priority-Match für die unteren 10% der Ränge
 */
function findMatchInLayoutQueue() {
    if (layoutQueue.length < 2) return null;
    
    // Dynamische Ermittlung des "Tabellenendes" in dieser Queue
    const lowRankLimit = globalMaxRang * 0.9;

    const jetzt = Date.now();

    for (let i = 0; i < layoutQueue.length; i++) {
        for (let j = i + 1; j < layoutQueue.length; j++) {
            const p1 = layoutQueue[i];
            const p2 = layoutQueue[j];

            if (p1.name === p2.name) {
                layoutQueue.splice(i, 1);
                return findMatchInLayoutQueue();
            }
            
            if (bypassMatchmaking) {
				    return extractPairFromLayoutQueue(i, j);
				}
				
            const wartedauerP1 = jetzt - p1.startTime;
            const wartedauerP2 = jetzt - p2.startTime;
            const maxWartezeit = Math.max(wartedauerP1, wartedauerP2);

            // NEU: Sofort-Match für untere 10% (überspringt Phasen 1 & 2)
            const isPriorityMatch = p1.rank >= lowRankLimit || p2.rank >= lowRankLimit;

            if (isPriorityMatch) {
                return extractPairFromLayoutQueue(i, j);
            }

            // Phase 1: Exaktes Layout-Match (<30s)
            if (maxWartezeit <= 30000) {
                if (p1.layoutId === p2.layoutId) {
                    return extractPairFromLayoutQueue(i, j);
                }
            } 
            // Phase 2: Beliebiges Layout, aber Rang-Check (30s - 60s)
            else if (maxWartezeit > 30000 && maxWartezeit <= 60000) {
                if (Math.abs(p1.rank - p2.rank) <= MAX_RANK_DIFF) {
                    return extractPairFromLayoutQueue(i, j);
                }
            } 
            // Phase 3: "Egal"-Prinzip (>60s)
            else {
                return extractPairFromLayoutQueue(i, j);
            }
        }
    }
    return null;
}

function findCrossQueueMatch() {
    if (layoutQueue.length === 0 || waitingQueue.length === 0) return null;
    const jetzt = Date.now();

		for (let i = 0; i < layoutQueue.length; i++) {
		    const p1 = layoutQueue[i];
		    
		    // NEU
		    const wartezeit = bypassMatchmaking ? 15000 : 60000;
		    if (jetzt - p1.startTime <= wartezeit) continue;
		
		    // original (diese Zeile löschen bzw. ersetzen):
		    // if (jetzt - p1.startTime <= 60000) continue;

        let targetIdx = waitingQueue.findIndex(wp =>
            wp.name !== p1.name && Math.abs(p1.rank - wp.rank) <= MAX_RANK_DIFF
        );
        if (targetIdx === -1) targetIdx = waitingQueue.findIndex(wp => wp.name !== p1.name);
        if (targetIdx === -1) continue;

        const p2 = waitingQueue[targetIdx];
        layoutQueue.splice(i, 1);
        waitingQueue.splice(targetIdx, 1);
        return [p1, p2];
    }
    return null;
}

function extractPairFromLayoutQueue(i, j) {
    const pair = [layoutQueue[i], layoutQueue[j]];
    layoutQueue.splice(j, 1);
    layoutQueue.splice(i, 1);
    return pair;
}

module.exports = {
    addToWaitingQueue,
    addToLayoutQueue,
    removeFromQueues,
    getRandomLayout,
    findMatchInWaitingQueue,
    findMatchInLayoutQueue,
    findCrossQueueMatch,
    getWaitingQueue: () => waitingQueue,
    getLayoutQueue: () => layoutQueue,
    setGlobalMaxRang,
    setBypassMatchmaking,
    MAX_RANK_DIFF
};