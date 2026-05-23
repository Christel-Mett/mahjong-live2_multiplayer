// Prüft, ob es sich um ein Apple-Gerät handelt (inkl. iPadOS-Erkennung)
function isAppleDevice() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isIOS || isIPadOS;
}

// --- MULTIPLAYER KONFIGURATION ---
//const socket = io();
//NEUER BLOCK MIT APPLECHECK
const socketOptions = isAppleDevice() 
    ? { 
        transports: ['websocket'], 
        upgrade: false, 
        reconnectionAttempts: 5, 
        timeout: 10000 
      }
    : { 
        transports: ['polling', 'websocket'], 
        upgrade: true, 
        reconnectionAttempts: 5, 
        timeout: 10000 
      };
//ENDE DES BLOCKS

const socket = io(socketOptions);
const meinName = localStorage.getItem('mahjongPlayerName') || 'Spieler';

// Daten aus der Layout-Suche abrufen
let matchData = null;
const rawMatchData = sessionStorage.getItem('mahjongMatchData');
if (rawMatchData) {
    try {
        matchData = JSON.parse(rawMatchData);
    } catch (e) {
        console.error("Fehler beim Parsen der Match-Daten", e);
    }
}

const roomID = matchData ? matchData.room : sessionStorage.getItem('mp_room');
const gegnerName = matchData ? matchData.opponent : (sessionStorage.getItem('mp_opponent') || 'Gegner');
const festesLayout = matchData ? matchData.layout : (sessionStorage.getItem('mp_layout') || 'default');
const festesSeed = matchData ? matchData.seed : (parseInt(sessionStorage.getItem('mp_seed')) || Math.floor(Math.random() * 1000000));

if (matchData) {
    sessionStorage.removeItem('mahjongMatchData');
}

// Dem Raum beitreten, damit der Chat-Server die Nachrichten korrekt zustellen kann
if (roomID) {
    socket.emit('join_room', roomID);
}

// --- BASIS KONFIGURATION ---
const rotateZ = 1.5, shiftX = 10, shiftY = 10;
const steinB = 3.0, steinH = 4.0, steinT = 1.5, kantenRadius = 0.12;
const farbeOben = 0xe5e3cc, farbeSeite = 0xba9563, farbeBodenSchicht = 0x9b5e22, farbeHighlight = 0xfff0ad;

let aktuellerSeed = festesSeed;
const sounds = {
    klick: new Audio('../shared/sound/klick.mp3'),
    swoosh: new Audio('../shared/sound/swoosh.mp3'),
    bing: new Audio('../shared/sound/bing.mp3'),
    blip: new Audio('../shared/sound/blip.mp3')
};

window.updateVolume = function(val) {
    const vol = parseFloat(val);
    if (sounds) {
        Object.values(sounds).forEach(s => { s.volume = vol; });
    }
    const volDisplay = document.getElementById('volValue');
    if (volDisplay) { volDisplay.textContent = Math.round(vol * 100) + "%"; }
    localStorage.setItem('mahjongVolume', vol);
};

let kameraZoom = parseFloat(localStorage.getItem('mahjongZoom') || 18);
let ersterStein = null, letztesSymbolMatch = null, timerInterval = null, sekunden = 0, spielBeendet = false;
let aktuellePunkte = 0;

// --- THREE.JS SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const container = document.getElementById('game-container');
if(container) {
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
}

const mainGroup = new THREE.Group();
scene.add(mainGroup);

const oppScene = new THREE.Scene();
const oppCamera = new THREE.OrthographicCamera();
const oppRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const oppContainer = document.getElementById('opponent-view');
if(oppContainer) {
    oppRenderer.setSize(oppContainer.clientWidth, oppContainer.clientHeight);
    oppContainer.appendChild(oppRenderer.domElement);
}

const oppGroup = new THREE.Group();
oppScene.add(oppGroup);

[scene, oppScene].forEach(s => {
    s.add(new THREE.AmbientLight(0xffffff, 0.75));
    const d = new THREE.DirectionalLight(0xffffff, 0.3);
    d.position.set(20, 30, 40);
    s.add(d);
});

const alleMotive = [
    'BAMBOO_1', 'BAMBOO_2', 'BAMBOO_3', 'BAMBOO_4', 'BAMBOO_5', 'BAMBOO_6', 'BAMBOO_7', 'BAMBOO_8', 'BAMBOO_9',
    'CHARACTER_1', 'CHARACTER_2', 'CHARACTER_3', 'CHARACTER_4', 'CHARACTER_5', 'CHARACTER_6', 'CHARACTER_7', 'CHARACTER_8', 'CHARACTER_9',
    'DRAGON_2', 'DRAGON_3', 'FLOWER_1', 'FLOWER_2', 'FLOWER_3', 'FLOWER_4',
    'ROD_1', 'ROD_2', 'ROD_3', 'ROD_4', 'ROD_5', 'ROD_6', 'ROD_7', 'ROD_8', 'ROD_9',
    'SEASON_1', 'SEASON_2', 'SEASON_3', 'SEASON_4', 'WIND_1', 'WIND_2', 'WIND_3', 'WIND_4'
];

// --- Übersetzungen ---
const layoutUebersetzungen = {
	 'arrow': 'Pfeil',
    'balance': 'Waage',
    'bug': 'Käfer',
    'chip': 'Chip',
    'eagle': 'Adler',
    'enterprise': 'Enterprise',
    'flowers': 'Blumen',
    'future': 'Zukunft',
    'garden': 'Garten',
    'glade': 'Lichtung',
    'helios': 'Helios',
    'inner_circle': 'Innerer Kreis',
    'km': 'KM',
    'mesh': 'Netz',
    'rocket': 'Rakete',
    'the_door': 'Die Tür',
    'time_tunnel': 'Zeittunnel',
};

const matSide = new THREE.MeshPhongMaterial({ color: farbeSeite });
matSide.onBeforeCompile = (shader) => {
    shader.uniforms.uColorBottom = { value: new THREE.Color(farbeBodenSchicht) };
    shader.vertexShader = `varying vec3 vLocalPos;\n${shader.vertexShader}`.replace(`#include <begin_vertex>`, `#include <begin_vertex>\nvLocalPos = position;`);
    shader.fragmentShader = `uniform vec3 uColorBottom; varying vec3 vLocalPos;\n${shader.fragmentShader}`.replace(`#include <map_fragment>`, `#include <map_fragment>\nfloat t = smoothstep(0.7, 1.4, vLocalPos.z); diffuseColor.rgb = mix(uColorBottom, diffuseColor.rgb, t);`);
};

function seededRandom() {
    let x = Math.sin(aktuellerSeed++) * 10000;
    return x - Math.floor(x);
}

function shuffleWithSeed(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getSymbolGruppe(symbolName) {
    if (!symbolName) return null;
    const base = symbolName.split('.')[0];
    if (base.startsWith('FLOWER')) return 'GRUPPE_BLUMEN';
    if (base.startsWith('SEASON')) return 'GRUPPE_ZEITEN';
    return base;
}

function istSlotFreiZumBefüllen(slot, alleSlots) {
    let blockL = false, blockR = false;
    for (let o of alleSlots) {
        if (o === slot || o.belegt) continue;
        if (o.layer === slot.layer + 1 && Math.abs(o.row - slot.row) < 1.9 && Math.abs(o.col - slot.col) < 1.9) return false;
        if (o.layer === slot.layer && Math.abs(o.row - slot.row) < 1.9) {
            if (o.col - slot.col >= 1.7 && o.col - slot.col <= 2.3) blockR = true;
            if (o.col - slot.col <= -1.7 && o.col - slot.col >= -2.3) blockL = true;
        }
    }
    return !(blockL && blockR);
}

function istSteinFrei(data, group) {
    let blockL = false, blockR = false, blockO = false;
    for (let otherObj of group.children) {
        if (!otherObj.visible || otherObj.position.x > 500) continue;
        const o = otherObj.userData;
        if (o.id === data.id) continue;
        if (o.layer === data.layer + 1 && Math.abs(o.row - data.row) < 1.9 && Math.abs(o.col - data.col) < 1.9) blockO = true;
        if (o.layer === data.layer && Math.abs(o.row - data.row) < 1.9) {
            if (o.col - data.col >= 1.7 && o.col - data.col <= 2.3) blockR = true;
            if (o.col - data.col <= -1.7 && o.col - data.col >= -2.3) blockL = true;
        }
    }
    return !blockO && (!blockL || !blockR);
}

function beendeSpiel(grund) {
    if (spielBeendet) return;
    spielBeendet = true;
    
    if (timerInterval) clearInterval(timerInterval);

    if (grund === 'sieg') {
        aktuellePunkte += 50; 
        const zeitLimit = 210;
        if (sekunden < zeitLimit) {
            aktuellePunkte += (zeitLimit - sekunden);
        }
    }

    let grundAnzeige = "";
    if (grund === 'sieg') grundAnzeige = "Sieg (Alle Steine gelöscht!)";
    else if (grund === 'sackgasse') grundAnzeige = "Sackgasse (Keine Züge mehr möglich)";
    else if (grund === 'aufgabe') grundAnzeige = "Aufgabe durch Spieler";

    zeigeEndOverlay(grundAnzeige);
    
    const graceTimer = document.getElementById('grace-period-timer');
    const graceSeconds = document.getElementById('grace-seconds');
    if (graceTimer) graceTimer.style.display = 'block';
    
const leaveBtn = document.getElementById('leave-game-btn');
if (leaveBtn) leaveBtn.disabled = true;

let timeLeft = 30;
const localGraceInterval = setInterval(() => {
    timeLeft--;
    if (graceSeconds) graceSeconds.textContent = timeLeft;
    
    // NEU: Update Sidebar falls vorhanden
    const sidebarSeconds = document.getElementById('grace-timer-sidebar');
    if (sidebarSeconds) sidebarSeconds.textContent = timeLeft;
    
    if (timeLeft <= 0 || document.getElementById('final-scoreboard').style.display !== 'none') {
        clearInterval(localGraceInterval);
        if (leaveBtn) leaveBtn.disabled = false;
    }
}, 1000);

    socket.emit('gameFinished', { 
        room: roomID, 
        user: meinName, 
        reason: grund,
        finalPoints: aktuellePunkte 
    });
}

function zeigeEndOverlay(grund) {
    const overlay = document.getElementById('game-end-overlay');
    const reasonText = document.getElementById('end-status-reason');
    if (overlay) {
        overlay.style.display = 'flex';
        if (reasonText) reasonText.textContent = grund;
    }
}

async function initGame() {
    const layoutPath = `../shared/layout/${festesLayout}.layout`;
    const layoutNameDisplay = document.getElementById('layoutNameDisplay');
    const opponentDisplay = document.getElementById('opponent-name');
    if (opponentDisplay) opponentDisplay.textContent = gegnerName;
    if (layoutNameDisplay) {
        layoutNameDisplay.textContent = layoutUebersetzungen[festesLayout] || festesLayout;
    }
    try {
        const resp = await fetch(layoutPath);
        if (!resp.ok) throw new Error("Layout nicht gefunden");
        const text = await resp.text();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('k'));

        const rawSlots = [];
        let minCol = 100, maxCol = 0, minRow = 100, maxRow = 0;

        lines.forEach((line, yIdx) => {
            const layer = Math.floor(yIdx / 16), row = yIdx % 16;
            for (let col = 0; col < line.length; col++) {
                if (line[col] === '1') {
                    rawSlots.push({ layer, row, col, belegt: false, id: `L${layer}R${row}C${col}` });
                    if (col < minCol) minCol = col; if (col > maxCol) maxCol = col;
                    if (row < minRow) minRow = row; if (row > maxRow) maxRow = row;
                }
            }
        });

        const centerCol = (minCol + maxCol) / 2, centerRow = (minRow + maxRow) / 2;
        let pool = [];
        let motiveShuffled = shuffleWithSeed([...alleMotive]);
        let mIdx = 0;
        while (pool.length < rawSlots.length) {
            if (mIdx >= motiveShuffled.length) { motiveShuffled = shuffleWithSeed([...alleMotive]); mIdx = 0; }
            let s = motiveShuffled[mIdx] + '.png';
            for(let i=0; i < (rawSlots.length - pool.length >= 4 ? 4 : 2); i++) pool.push(s);
            mIdx++;
        }
        pool = shuffleWithSeed(pool);

			const finalData = [];
			let erfolgreichVerteilt = false;
			let versuche = 0;
			
			while (!erfolgreichVerteilt && versuche < 100) {
			    versuche++;
			    let tempPool = [...pool];
			    let tempSlots = rawSlots.map(s => ({ ...s, belegt: false }));
			    let aktuelleVerteilung = [];
			    
			    while (tempPool.length > 0) {
			        let frei = tempSlots.filter(s => !s.belegt && istSlotFreiZumBefüllen(s, tempSlots));
			        if (frei.length < 2) break;
			
			        let sym = tempPool.pop();
			        let pIdx = tempPool.indexOf(sym);
			        if (pIdx > -1) tempPool.splice(pIdx, 1);
			
			        let rIdx = Math.floor(seededRandom() * frei.length);
			        let s1 = frei.splice(rIdx, 1)[0];
			        s1.belegt = true;
			        s1.symbol = sym;
			        aktuelleVerteilung.push(s1);
			
			        let nahKandidaten = frei.filter(k => Math.abs(k.col - s1.col) <= 4 && Math.abs(k.row - s1.row) <= 4);
			        let s2 = (nahKandidaten.length > 0) 
			            ? nahKandidaten[Math.floor(seededRandom() * nahKandidaten.length)]
			            : frei[Math.floor(seededRandom() * frei.length)];
			
			        s2.belegt = true;
			        s2.symbol = sym;
			        aktuelleVerteilung.push(s2);
			        frei.splice(frei.indexOf(s2), 1);
			    }
			    
			    if (aktuelleVerteilung.length === rawSlots.length) {
			        finalData.push(...aktuelleVerteilung);
			        erfolgreichVerteilt = true;
			    }
			}

			const loadingManager = new THREE.LoadingManager();
			loadingManager.onLoad = () => {
			    // Alle Steine sichtbar schalten, falls sie noch versteckt sind
			    mainGroup.children.forEach(g => { if(g.position.x < 500) g.visible = true; });
			    oppGroup.children.forEach(g => { if(g.position.x < 500) g.visible = true; });
			};
			const loader = new THREE.TextureLoader(loadingManager);
        const b_ = steinB * 0.98, h_ = steinH * 0.98, r_ = kantenRadius;
        const shape = new THREE.Shape();
        shape.moveTo(-b_/2, -h_/2+r_); shape.lineTo(-b_/2, h_/2-r_); shape.quadraticCurveTo(-b_/2, h_/2, -b_/2+r_, h_/2);
        shape.lineTo(b_/2-r_, h_/2); shape.quadraticCurveTo(b_/2, h_/2, b_/2, h_/2-r_);
        shape.lineTo(b_/2, -h_/2+r_); shape.quadraticCurveTo(b_/2, -h_/2, b_/2-r_, -h_/2);
        shape.lineTo(-b_/2+r_, -h_/2); shape.quadraticCurveTo(-b_/2, -h_/2, -b_/2, -h_/2+r_);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: steinT, bevelEnabled: true, bevelSegments: 5, bevelSize: r_, bevelThickness: r_ });

        [mainGroup, oppGroup].forEach(tg => {
            tg.clear();
            finalData.forEach(d => {
                const g = new THREE.Group();
                g.position.set((d.col - centerCol) * (steinB*0.5), -(d.row - centerRow) * (steinH*0.5), d.layer * (steinT+0.1));
                const mesh = new THREE.Mesh(geo, [new THREE.MeshPhongMaterial({ color: farbeOben }), matSide]);
                const t = loader.load(`../shared/bilder/${d.symbol}`);
                const sm = new THREE.Mesh(new THREE.PlaneGeometry(steinB, steinH), new THREE.MeshBasicMaterial({ map: t, transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
                sm.position.z = steinT + r_ + 0.02;
                g.add(mesh, sm);
                g.userData = {...d}; 
                tg.add(g);
            });
            tg.position.set(shiftX, shiftY, 0);
            tg.rotation.z = THREE.MathUtils.degToRad(rotateZ);
        });

        updateCamera(); updateOpponentCamera();
        socket.emit('joinRoom', { room: roomID, name: meinName });
        startTimer();
        updateStats();
    } catch (e) { console.error("Layout Fehler:", e); }
}

window.addEventListener('mousedown', (e) => {
    if (spielBeendet) return;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / container.clientWidth) * 2 - 1, -((e.clientY - rect.top) / container.clientHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(mainGroup.children, true).filter(i => i.object.visible);

    if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj.parent && obj.parent !== mainGroup) obj = obj.parent;
        if (!istSteinFrei(obj.userData, mainGroup)) return;
        
        const visual = obj.children[0]; 
        if (!ersterStein) {
            ersterStein = obj;
            visual.material[0].color.setHex(farbeHighlight);
            sounds.klick.play();
        } else {
            if (ersterStein === obj) {
                visual.material[0].color.setHex(farbeOben);
                ersterStein = null; 
                return;
            }
            const s1 = ersterStein.userData.symbol, s2 = obj.userData.symbol;
            const g1 = getSymbolGruppe(s1), g2 = getSymbolGruppe(s2);

            if (s1 === s2 || (g1 === g2 && g1 !== null && g1.startsWith('GRUPPE'))) {
					 sounds.swoosh.currentTime = 0;                   
                sounds.swoosh.play();

                if (letztesSymbolMatch === (g1 || s1)) {
                    aktuellePunkte += 5;
                    if (sounds.bing) {
                        sounds.bing.currentTime = 0;
                        sounds.bing.play();
                    }
                } else {
                    aktuellePunkte += 1;
                }

                letztesSymbolMatch = g1 || s1;
                
                socket.emit('playerMove', { room: roomID, moves: [{ id: ersterStein.userData.id }, { id: obj.userData.id }], punkte: aktuellePunkte });
                
                ersterStein.visible = obj.visible = false;
                ersterStein.position.x = obj.position.x = 1000;
                ersterStein = null;
                updateStats(); 
            } else {
                ersterStein.children[0].material[0].color.setHex(farbeOben);
                ersterStein = obj;
                visual.material[0].color.setHex(farbeHighlight);
                sounds.klick.play();
            }
        }
    } else if (ersterStein) {
        ersterStein.children[0].material[0].color.setHex(farbeOben);
        ersterStein = null;
    }
});

socket.on('opponentMove', (data) => {
    if (!data || !data.moves) return;
    data.moves.forEach(m => {
        const stein = oppGroup.children.find(c => c.userData.id === m.id);
        if (stein) { stein.visible = false; stein.position.x = 1000; }
    });
});

function updateCamera() {
    const a = container.clientWidth / container.clientHeight;
    camera.left = -kameraZoom * a; camera.right = kameraZoom * a; camera.top = kameraZoom; camera.bottom = -kameraZoom;
    camera.position.set(0, 0, 50); camera.lookAt(shiftX, shiftY, 0); camera.updateProjectionMatrix();
}

function updateOpponentCamera() {
    const a = oppContainer.clientWidth / oppContainer.clientHeight;
    const d = 22;
    oppCamera.left = -d * a; oppCamera.right = d * a; oppCamera.top = d; oppCamera.bottom = -d;
    oppCamera.position.set(0, 0, 50); oppCamera.lookAt(shiftX, shiftY, 0); oppCamera.updateProjectionMatrix();
}

function checkAvailablePairs() {
    const freieSteine = mainGroup.children.filter(c => 
        c.visible && 
        c.position.x < 500 && 
        istSteinFrei(c.userData, mainGroup)
    );

    let paareCount = 0;
    for (let i = 0; i < freieSteine.length; i++) {
        for (let j = i + 1; j < freieSteine.length; j++) {
            const s1 = freieSteine[i].userData.symbol;
            const s2 = freieSteine[j].userData.symbol;
            const g1 = getSymbolGruppe(s1);
            const g2 = getSymbolGruppe(s2);

            if (s1 === s2 || (g1 === g2 && g1 !== null && g1.startsWith('GRUPPE'))) {
                paareCount++;
            }
        }
    }
    return paareCount;
}

function updateStats() {
    const alleSteine = mainGroup.children.filter(c => c.visible && c.position.x < 500);
    const moeglichePaare = checkAvailablePairs();

    document.getElementById('tiles-count').textContent = alleSteine.length;
    document.getElementById('player-points').textContent = aktuellePunkte;
    document.getElementById('pairs-count').textContent = moeglichePaare;

    if (!spielBeendet && alleSteine.length === 0) {
        beendeSpiel('sieg');
        return;
    }

    if (!spielBeendet && alleSteine.length > 0 && moeglichePaare === 0) {
        beendeSpiel('sackgasse');
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        sekunden++;
        const m = Math.floor(sekunden / 60).toString().padStart(2, '0');
        const s = (sekunden % 60).toString().padStart(2, '0');
        if(document.getElementById('timer')) document.getElementById('timer').textContent = `${m}:${s}`;
    }, 1000);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    oppRenderer.render(oppScene, oppCamera);
}

socket.on('gracePeriodStarted', () => {
    if (!spielBeendet) {
        const graceTimer = document.getElementById('grace-period-timer');
        const graceSeconds = document.getElementById('grace-seconds');
        const sidebarOverlay = document.getElementById('grace-overlay-sidebar');
        const sidebarSeconds = document.getElementById('grace-timer-sidebar');

        if (graceTimer) graceTimer.style.display = 'block';
        if (sidebarOverlay) sidebarOverlay.style.display = 'flex';
        
        let timeLeft = 30;
        // Wir speichern das Intervall in einer Konstante innerhalb des Scopes
        const interval = setInterval(() => {
            timeLeft--;
            
            // Anzeige im End-Overlay (Mitte)
            if (graceSeconds) graceSeconds.textContent = timeLeft;
            // Anzeige in der Sidebar (Rechts)
            if (sidebarSeconds) sidebarSeconds.textContent = timeLeft;

            if (sounds.blip) {
                sounds.blip.currentTime = 0;
                sounds.blip.play().catch(() => {});
            }

            if (timeLeft <= 0 || spielBeendet) {
                clearInterval(interval);
                if (graceTimer) graceTimer.style.display = 'none';
                if (sidebarOverlay) sidebarOverlay.style.display = 'none';
            }
        }, 1000);
    }
});

socket.on('finalScoreboard', (data) => {
    spielBeendet = true;
    if (timerInterval) clearInterval(timerInterval);

    zeigeEndOverlay('Spiel beendet');

    const scoreboard = document.getElementById('final-scoreboard');
    const winnerLine = document.getElementById('winner-line');
    const secondLine = document.getElementById('second-line');
    const lobbyBtn = document.getElementById('back-to-lobby-btn');
    const graceTimer = document.getElementById('grace-period-timer');

    if (graceTimer) graceTimer.style.display = 'none';

    if (data.scores) {
        data.scores.sort((a, b) => b.points - a.points);
        if (winnerLine) winnerLine.textContent = `1. Platz: ${data.scores[0].name} (${data.scores[0].points} Pkt.)`;
        if (secondLine && data.scores[1]) {
            secondLine.textContent = `2. Platz: ${data.scores[1].name} (${data.scores[1].points} Pkt.)`;
        }
    }

    if (scoreboard) scoreboard.style.display = 'block';
    if (lobbyBtn) lobbyBtn.style.display = 'inline-block';
});

window.leaveGame = function() {
    if (!spielBeendet) {
        beendeSpiel('aufgabe');
    } else {
        window.location.href = 'lobby-auswahl.html';
    }
};

window.addEventListener('beforeunload', (event) => {
    if (!spielBeendet) {
        beendeSpiel('aufgabe');
        event.preventDefault();
        event.returnValue = ''; 
    }
});

if (window.performance && window.performance.navigation.type === window.performance.navigation.TYPE_RELOAD) {
    window.location.href = '../lobby.html';
}

document.addEventListener('DOMContentLoaded', () => { 
    initGame(); 
    animate(); 
    const vSlider = document.getElementById('volumeSlider');
    if (vSlider) vSlider.addEventListener('input', (e) => updateVolume(e.target.value));
    const zSlider = document.getElementById('zoomSlider');
    if (zSlider) zSlider.addEventListener('input', (e) => {
        kameraZoom = 40 - parseFloat(e.target.value);
        updateCamera();
    });
});