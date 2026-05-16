// --- KONFIGURATION ---
const meineLayouts = [
    '4_winds', 'alien', 'altar', 'arena', 'arrow', 'atlantis', 'aztec', 'balance', 
    'bat', 'bug', 'castle2', 'chains', 'checkered', 'chip', 
    'clubs', 'columns', 'cross', 'eagle', 'enterprise', 
    'explosion', 'flowers', 'future', 'galaxy', 'garden', 'girl', 'glade', 'grid', 
    'helios', 'hole', 'inner_circle', 'key', 'km', 'labyrinth', 'mask', 'maya', 
    'maze', 'mesh', 'moth', 'order', 'pattern', 'penta', 'pillars', 'pirates', 
    'rocket', 'shield', 'squares', 'squaring', 'stadion', 
    'stairs', 'star', 'star_ship', 'stax', 'swirl', 'temple', 'theatre', 'the_door', 
    'time_tunnel', 'tomb', 'totem', 'up&down', 'well', 'X_shaped'
];

let aktuelleFigur = localStorage.getItem('mahjongLayout') || meineLayouts[0];

const layoutUebersetzungen = {
    '4_winds': '4 Winde', 'alien': 'Alien', 'altar': 'Altar', 'arena': 'Arena', 
    'arrow': 'Pfeil', 'atlantis': 'Atlantis', 'aztec': 'Azteken', 'balance': 'Waage',
    'bat': 'Fledermaus', 'bug': 'Käfer', 'castle2': 'Burg', 
    'chains': 'Ketten', 'checkered': 'Karos', 'chip': 'Chip', 
    'clubs': 'Clubs', 'columns': 'Säulen', 'cross': 'Kreuz', 
    'eagle': 'Adler', 'enterprise': 'Enterprise',
    'explosion': 'Explosion', 'flowers': 'Blumen', 'future': 'Zukunft', 'galaxy': 'Galaxie', 
    'garden': 'Garten', 'girl': 'Mädchen', 'glade': 'Lichtung', 'grid': 'Gitter',
    'helios': 'Helios', 'hole': 'Loch', 'inner_circle': 'Innerer Kreis', 'key': 'Schlüssel', 
    'km': 'KM', 'labyrinth': 'Labyrinth', 'mask': 'Maske', 'maya': 'Maya',
    'maze': 'Irrgarten', 'mesh': 'Netz', 'moth': 'Motte', 'order': 'Ordnung', 
    'pattern': 'Muster', 'penta': 'Penta', 'pillars': 'Pfeiler', 'pirates': 'Piraten',
    'rocket': 'Rakete', 'shield': 'Schild', 
    'squares': 'Quadrate', 'squaring': 'Quadrierung', 'stadion': 'Stadion', 'stairs': 'Treppen', 
    'star': 'Stern', 'star_ship': 'Sternenschiff', 'stax': 'Stapel', 'swirl': 'Wirbel', 
    'temple': 'Tempel', 'theatre': 'Theater', 'the_door': 'Die Tür', 
    'time_tunnel': 'Zeittunnel', 'tomb': 'Grabmal', 'totem': 'Totem', 
    'up&down': 'Auf & Ab', 'well': 'Brunnen', 'X_shaped': 'X-Form'
};

const rotateZ = 1.5, shiftX = 10, shiftY = 10;
const steinB = 3.0, steinH = 4.0, steinT = 1.5, kantenRadius = 0.12;
const farbeOben = 0xe5e3cc, farbeSeite = 0xba9563, farbeBodenSchicht = 0x0a1a12, farbeHighlight = 0xfff0ad;

let aktuellerSeed = 0;
let initialerSeedFuerDiesesBrett = 0;

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

const sounds = {
    klick: new Audio('../shared/sound/klick.mp3'),
    swoosh: new Audio('../shared/sound/swoosh.mp3'),
    bing: new Audio('../shared/sound/bing.mp3')
};

function unlockAudio() {
    Object.values(sounds).forEach(s => {
        s.play().then(() => { s.pause(); s.currentTime = 0; }).catch(() => {});
    });
    document.removeEventListener('click', unlockAudio);
}
document.addEventListener('click', unlockAudio);
Object.values(sounds).forEach(s => s.load());

let aktuelleLautstaerke = parseFloat(localStorage.getItem('mahjongVolume')) || 0.5;
// NEU: Lädt den Slider-Stand und rechnet ihn sofort für die Kamera um (35 - Wert)
let gespeicherterSliderWert = parseFloat(localStorage.getItem('mahjongZoom')) || 18;
let kameraZoom = 35 - gespeicherterSliderWert;

let ersterStein = null, timerInterval = null, sekunden = 0, zugVerlauf = [];
let istPause = false, punkte = 0, spielBeendet = false;
let neuerHighscoreEintrag = null;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const container = document.getElementById('game-container');

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
dirLight.position.set(20, 30, 40); 
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -50; 
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

const groundGeom = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.2 });
const ground = new THREE.Mesh(groundGeom, groundMat);
ground.position.z = -0.1;
ground.receiveShadow = true;
scene.add(ground);

const mainGroup = new THREE.Group();
scene.add(mainGroup);

const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
    mainGroup.children.forEach(g => { if(g.position.x < 500) g.visible = true; });
    checkGameState();
    startTimer();
};
const loader = new THREE.TextureLoader(loadingManager);

const matSide = new THREE.MeshPhongMaterial({ color: farbeSeite });
matSide.onBeforeCompile = (shader) => {
    shader.uniforms.uColorBottom = { value: new THREE.Color(farbeBodenSchicht) };
    shader.vertexShader = `varying vec3 vLocalPos;\n${shader.vertexShader}`.replace(`#include <begin_vertex>`, `#include <begin_vertex>\nvLocalPos = position;`);
    shader.fragmentShader = `uniform vec3 uColorBottom; varying vec3 vLocalPos;\n${shader.fragmentShader}`.replace(`#include <map_fragment>`, `#include <map_fragment>\nif(vLocalPos.z < 0.35) { diffuseColor.rgb = uColorBottom; }`);
};

function getSymbolGruppe(symbolName) {
    if (!symbolName) return null;
    if (symbolName.startsWith('FLOWER')) return 'GRUPPE_BLUMEN';
    if (symbolName.startsWith('SEASON')) return 'GRUPPE_ZEITEN';
    return symbolName;
}

function istSlotFreiZumBefüllen(slot, alleSlots) {
    let blockLinks = false, blockRechts = false, blockOben = false;
    const data = slot.userData;
    for (let other of alleSlots) {
        const o = other.userData;
        if (o === data || o.belegt) continue;
        if (o.layer === data.layer + 1 && Math.abs(o.row - data.row) < 1.9 && Math.abs(o.col - data.col) < 1.9) blockOben = true;
        if (o.layer === data.layer && Math.abs(o.row - data.row) < 1.9) {
            if (o.col - data.col >= 1.7 && o.col - data.col <= 2.3) blockRechts = true;
            if (o.col - data.col <= -1.7 && o.col - data.col >= -2.3) blockLinks = true;
        }
    }
    return !blockOben && (!blockLinks || !blockRechts);
}

function istSteinFrei(data) {
    let blockLinks = false, blockRechts = false, blockOben = false;
    for (let otherGroup of mainGroup.children) {
        if (!otherGroup.visible || otherGroup.position.x > 500) continue;
        const other = otherGroup.userData;
        if (other.meshGroup === data.meshGroup) continue;
        if (other.layer === data.layer + 1 && Math.abs(other.row - data.row) < 1.9 && Math.abs(other.col - data.col) < 1.9) blockOben = true;
        if (other.layer === data.layer && Math.abs(other.row - data.row) < 1.9) {
            if (other.col - data.col >= 1.7 && other.col - data.col <= 2.3) blockRechts = true;
            if (other.col - data.col <= -1.7 && other.col - data.col >= -2.3) blockLinks = true;
        }
    }
    return !blockOben && (!blockLinks || !blockRechts);
}

async function init(seed = null) {
    document.getElementById('overlay').style.display = 'none';
    if (timerInterval) clearInterval(timerInterval);
    initialerSeedFuerDiesesBrett = (seed !== null) ? seed : Math.floor(Math.random() * 1000000);
    aktuellerSeed = initialerSeedFuerDiesesBrett;
    const layoutDatei = '../shared/layout/' + aktuelleFigur + '.layout';
    const label = document.getElementById('layoutName');
    if (label) label.innerText = layoutUebersetzungen[aktuelleFigur] || aktuelleFigur;
    ersterStein = null; zugVerlauf = []; punkte = 0;
    spielBeendet = false; updateScoreDisplay(); istPause = false; mainGroup.visible = true;
    neuerHighscoreEintrag = null;
    try {
        const response = await fetch(layoutDatei);
        const text = await response.text();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('k'));
        mainGroup.clear();
        let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
        lines.forEach((line, yIdx) => {
            const row = yIdx % 16;
            for (let col = 0; col < line.length; col++) {
                if (line[col] === '1') {
                    if (col < minCol) minCol = col; if (col > maxCol) maxCol = col;
                    if (row < minRow) minRow = row; if (row > maxRow) maxRow = row;
                }
            }
        });
        const centerCol = (minCol + maxCol) / 2;
        const centerRow = (minRow + maxRow) / 2;
        lines.forEach((line, yIdx) => {
            const layer = Math.floor(yIdx / 16), row = yIdx % 16;
            for (let col = 0; col < line.length; col++) {
                if (line[col] === '1') {
                    const g = new THREE.Group();
                    g.userData = { layer, row, col, meshGroup: g, symbol: null, belegt: false };
                    g.position.set((col - centerCol) * (steinB * 0.5), -(row - centerRow) * (steinH * 0.5), layer * (steinT + 0.1));
                    g.visible = false; 
                    mainGroup.add(g);
                }
            }
        });

        let alleSlots = [...mainGroup.children];
        const anzahlLayoutSteine = alleSlots.length;
        const alleMotive = [
            'BAMBOO_1', 'BAMBOO_2', 'BAMBOO_3', 'BAMBOO_4', 'BAMBOO_5', 'BAMBOO_6', 'BAMBOO_7', 'BAMBOO_8', 'BAMBOO_9',
            'CHARACTER_1', 'CHARACTER_2', 'CHARACTER_3', 'CHARACTER_4', 'CHARACTER_5', 'CHARACTER_6', 'CHARACTER_7', 'CHARACTER_8', 'CHARACTER_9',
            'DRAGON_2', 'DRAGON_3', 'FLOWER_1', 'FLOWER_2', 'FLOWER_3', 'FLOWER_4',
            'ROD_1', 'ROD_2', 'ROD_3', 'ROD_4', 'ROD_5', 'ROD_6', 'ROD_7', 'ROD_8', 'ROD_9',
            'SEASON_1', 'SEASON_2', 'SEASON_3', 'SEASON_4', 'WIND_1', 'WIND_2', 'WIND_3', 'WIND_4'
        ];
        
        let symbolPool = [];
        let gemischteMotive = shuffleWithSeed([...alleMotive]);
        let mIdx = 0;
        while (symbolPool.length < anzahlLayoutSteine) {
            if (mIdx >= gemischteMotive.length) { gemischteMotive = shuffleWithSeed([...alleMotive]); mIdx = 0; }
            let m = gemischteMotive[mIdx] + '.png';
            let nochNoetig = anzahlLayoutSteine - symbolPool.length;
            let anzahlFuerDiesenTyp = (nochNoetig >= 4) ? 4 : 2; 
            for(let i=0; i<anzahlFuerDiesenTyp; i++) symbolPool.push(m);
            mIdx++;
        }
        symbolPool = shuffleWithSeed(symbolPool);

        let erfolgreichVerteilt = false;
        let versuche = 0;
        
        while (!erfolgreichVerteilt && versuche < 100) {
            versuche++;
            let tempPool = [...symbolPool];
            alleSlots.forEach(s => { s.userData.belegt = false; s.userData.symbol = null; });
            let belegteAnzahl = 0;

		  while (belegteAnzahl < anzahlLayoutSteine) {
                let kandidaten = alleSlots.filter(s => !s.userData.belegt && istSlotFreiZumBefüllen(s, alleSlots));
                
                if (kandidaten.length < 2) break;

                let symbol = tempPool.pop();
                let index = tempPool.indexOf(symbol);
                
                if (index > -1) {
                    tempPool.splice(index, 1);
                    
                    // Ersten Stein zufällig wählen
                    let rIdx = Math.floor(seededRandom() * kandidaten.length);
                    let s1 = kandidaten.splice(rIdx, 1)[0];
                    s1.userData.symbol = symbol;
                    s1.userData.belegt = true;

                    // Zweiten Stein bevorzugt in der Nähe suchen
                    let nahKandidaten = kandidaten.filter(k => {
                        const dx = Math.abs(k.userData.col - s1.userData.col);
                        const dy = Math.abs(k.userData.row - s1.userData.row);
                        // Suchradius: ca. 2 Steinbreiten/höhen
                        return dx <= 4 && dy <= 4; 
                    });

                    let s2;
                    if (nahKandidaten.length > 0) {
                        let nIdx = Math.floor(seededRandom() * nahKandidaten.length);
                        s2 = nahKandidaten[nIdx];
                        // Den gewählten Nachbarn aus der Hauptliste entfernen
                        kandidaten.splice(kandidaten.indexOf(s2), 1);
                    } else {
                        // Fallback: Wenn kein Nachbar frei ist, nimm einen beliebigen freien Slot
                        s2 = kandidaten.splice(Math.floor(seededRandom() * kandidaten.length), 1)[0];
                    }

                    s2.userData.symbol = symbol;
                    s2.userData.belegt = true;
                    belegteAnzahl += 2;
                } else {
                    // Fallback für Einzelsymbole
                    let s = kandidaten.splice(0, 1)[0];
                    s.userData.symbol = symbol;
                    s.userData.belegt = true;
                    belegteAnzahl++;
                }
            }
            if (belegteAnzahl === anzahlLayoutSteine) erfolgreichVerteilt = true;
        }

        const b_ = steinB * 0.98, h_ = steinH * 0.98, r_ = kantenRadius;
        const shape = new THREE.Shape();
        shape.moveTo(-b_ / 2, -h_ / 2 + r_); shape.lineTo(-b_ / 2, h_ / 2 - r_); shape.quadraticCurveTo(-b_ / 2, h_ / 2, -b_ / 2 + r_, h_ / 2);
        shape.lineTo(b_ / 2 - r_, h_ / 2); shape.quadraticCurveTo(b_ / 2, h_ / 2, b_ / 2, h_ / 2 - r_);
        shape.lineTo(b_ / 2, -h_ / 2 + r_); shape.quadraticCurveTo(b_ / 2, -h_ / 2, b_ / 2 - r_, -h_ / 2);
        shape.lineTo(-b_ / 2 + r_, -h_ / 2); shape.quadraticCurveTo(-b_ / 2, -h_ / 2, -b_ / 2, -h_ / 2 + r_);
        const geom = new THREE.ExtrudeGeometry(shape, { depth: steinT, bevelEnabled: true, bevelSegments: 5, bevelSize: r_, bevelThickness: r_ });
        
        mainGroup.children.forEach(g => {
            const mesh = new THREE.Mesh(geom, [new THREE.MeshPhongMaterial({ color: farbeOben }), matSide.clone()]);
            mesh.castShadow = true; 
            mesh.receiveShadow = true; 
            g.add(mesh);
            if (g.userData.symbol) {
                loader.load('../shared/bilder/' + g.userData.symbol, (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    const sym = new THREE.Mesh(new THREE.PlaneGeometry(steinB, steinH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
                    sym.position.z = steinT + r_ + 0.02; g.add(sym);
                });
            }
        });
        mainGroup.position.set(shiftX, shiftY, 0); mainGroup.rotation.z = THREE.MathUtils.degToRad(rotateZ);
        updateCamera(); sekunden = 0; const tElem = document.getElementById('timer'); if (tElem) tElem.innerText = "00:00";
    } catch (e) { console.error("Fehler beim Laden des Layouts:", e); }
}

function checkGameState() {
    if (istPause) return;
    const v = mainGroup.children.filter(c => c.visible && c.position.x < 500);
    if (document.getElementById('count')) document.getElementById('count').innerText = v.length;
    const free = v.filter(s => istSteinFrei(s.userData));
    let matches = 0; const used = new Set();
    for (let i = 0; i < free.length; i++) {
        if (used.has(i)) continue;
        const sA = free[i].userData.symbol; const gA = getSymbolGruppe(sA);
        for (let j = i + 1; j < free.length; j++) {
            if (used.has(j)) continue;
            const sB = free[j].userData.symbol; const gB = getSymbolGruppe(sB);
            if (sA === sB || (gA === gB && (gA === 'GRUPPE_BLUMEN' || gA === 'GRUPPE_ZEITEN'))) {
                matches++; used.add(i); used.add(j); break;
            }
        }
    }
    if (document.getElementById('possiblePairs')) document.getElementById('possiblePairs').innerText = matches;
    if (v.length === 0 || (matches === 0 && v.length > 0)) { finishGame(v.length === 0 ? "Sieg!" : "Keine Züge mehr!"); }
}

function gleichesBrettErneutSpielen() { init(initialerSeedFuerDiesesBrett); }
function neuesSpielStarten() { init(); }


function finishGame(msg) {
    spielBeendet = true;
    if (timerInterval) clearInterval(timerInterval);

    if(msg === "Sieg!") {
        // 1. Zeitunabhängiger Fixbonus von 50 Punkten
        punkte += 50;

        // 2. Zeitbonus berechnen: Restzeit bis 3 Minuten (180 Sekunden)
        if (sekunden < 180) {
            punkte += (180 - sekunden);
        }
        
        updateScoreDisplay();
        pruefeUndBereiteHighscoreVor();
    }

    document.getElementById('endMessage').innerText = msg;
    document.getElementById('overlayBtn').innerText = "Schließen";
    document.getElementById('overlayBtn').onclick = () => { document.getElementById('overlay').style.display = 'none'; };
    document.getElementById('overlay').style.display = 'flex';
}

function spieleSound(typ) {
    if (!sounds[typ]) return;
    const s = sounds[typ].cloneNode(); s.volume = aktuelleLautstaerke; s.play().catch(() => {});
}

container.addEventListener('mousedown', (e) => {
    if (istPause || spielBeendet) return;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / container.clientWidth) * 2 - 1, -((e.clientY - rect.top) / container.clientHeight) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(mainGroup.children, true).filter(i => i.object.visible);
    if (intersects.length > 0) {
        let hit = intersects[0].object;
        while (hit.parent && hit.parent !== mainGroup) hit = hit.parent;
        if (!istSteinFrei(hit.userData)) return;
        const mesh = hit.children.find(c => c.geometry && c.geometry.type === 'ExtrudeGeometry');
        if (ersterStein === hit) {
            mesh.material[0].color.setHex(farbeOben); ersterStein = null;
        } else if (!ersterStein) {
            ersterStein = hit; mesh.material[0].color.setHex(farbeHighlight); spieleSound('klick');
        } else {
            const s1 = ersterStein.userData.symbol, s2 = hit.userData.symbol;
            const g1 = getSymbolGruppe(s1), g2 = getSymbolGruppe(s2);
            if (s1 === s2 || (g1 === g2 && (g1 === 'GRUPPE_BLUMEN' || g1 === 'GRUPPE_ZEITEN'))) {
                let p = 1, bonusAktiv = false;
                if (zugVerlauf.length > 0) {
                    const letzterStein = zugVerlauf[zugVerlauf.length - 1][0].obj.userData;
                    const letztesSymbol = letzterStein.symbol; const letzteGruppe = getSymbolGruppe(letztesSymbol);
                    if (letztesSymbol === s2 || (letzteGruppe === g2 && g2 !== null)) { bonusAktiv = true; p = 5; }
                }
                if (bonusAktiv) { spieleSound('swoosh'); spieleSound('bing'); } else { spieleSound('swoosh'); }
                punkte += p; updateScoreDisplay();
                zugVerlauf.push([{obj: ersterStein, pos: ersterStein.position.clone(), punkte: p}, {obj: hit, pos: hit.position.clone()}]);
                ersterStein.visible = hit.visible = false; ersterStein.position.x = hit.position.x = 1000; ersterStein = null; checkGameState();
            } else {
                ersterStein.children.find(c => c.geometry && c.geometry.type === 'ExtrudeGeometry').material[0].color.setHex(farbeOben);
                ersterStein = hit; mesh.material[0].color.setHex(farbeHighlight); spieleSound('klick');
            }
        }
    } else {
        if (ersterStein) {
            const mesh = ersterStein.children.find(c => c.geometry && c.geometry.type === 'ExtrudeGeometry');
            if (mesh) mesh.material[0].color.setHex(farbeOben);
            ersterStein = null;
        }
    }
});

function rueckgaengig() {
    if (istPause || zugVerlauf.length === 0) return;
    if (ersterStein) {
        const mesh = ersterStein.children.find(c => c.geometry && c.geometry.type === 'ExtrudeGeometry');
        if (mesh) mesh.material[0].color.setHex(farbeOben); ersterStein = null;
    }
    const letzterZug = zugVerlauf.pop(); punkte -= letzterZug[0].punkte; updateScoreDisplay();
    letzterZug.forEach(d => {
        if(d.obj) {
            d.obj.visible = true; d.obj.position.set(d.pos.x, d.pos.y, d.pos.z);
            const mesh = d.obj.children.find(c => c.geometry && c.geometry.type === 'ExtrudeGeometry');
            if (mesh) mesh.material[0].color.setHex(farbeOben);
        }
    });
    document.getElementById('overlay').style.display = 'none';
    if (spielBeendet) { spielBeendet = false; startTimer(); }
    checkGameState();
}

function zeigeHinweis() {
    if (istPause || spielBeendet) return;

    // 1. Alle verfügbaren Steine und freien Paare finden
    const v = mainGroup.children.filter(c => c.visible && c.position.x < 500);
    const free = v.filter(s => istSteinFrei(s.userData));
    
    let moeglichePaare = [];
    for (let i = 0; i < free.length; i++) {
        const sA = free[i].userData.symbol;
        const gA = getSymbolGruppe(sA);
        for (let j = i + 1; j < free.length; j++) {
            const sB = free[j].userData.symbol;
            const gB = getSymbolGruppe(sB);
            if (sA === sB || (gA === gB && (gA === 'GRUPPE_BLUMEN' || gA === 'GRUPPE_ZEITEN'))) {
                moeglichePaare.push([free[i], free[j]]);
            }
        }
    }

    if (moeglichePaare.length > 0) {
        // 2. Ein zufälliges Paar auswählen
        const zufallsPaar = moeglichePaare[Math.floor(Math.random() * moeglichePaare.length)];
        
        zufallsPaar.forEach(stein => {
            const mesh = stein.children.find(c => c.geometry && c.geometry.type === 'ExtrudeGeometry');
            if (mesh) {
                // Startwerte speichern
                const originalZ = stein.position.z;
                const originalScale = stein.scale.clone();
                
                // Effekt-Werte
                const zielZ = originalZ + 0.5; // Leicht anheben
                const scaleFaktor = 1.05;      // Leicht vergrößern

                // Sofort hervorheben
                stein.position.z = zielZ;
                stein.scale.set(scaleFaktor, scaleFaktor, 1);
                mesh.material[0].color.setHex(farbeHighlight);

                // Puls-Intervall (wechselt alle 200ms)
                let blinkt = true;
                let intervalId = setInterval(() => {
                    blinkt = !blinkt;
                    mesh.material[0].color.setHex(blinkt ? farbeHighlight : farbeOben);
                }, 200);

                // 3. Nach 2 Sekunden alles zurücksetzen
                setTimeout(() => {
                    clearInterval(intervalId);
                    stein.position.z = originalZ;
                    stein.scale.copy(originalScale);
                    
                    // Farbe nur zurücksetzen, wenn der Stein nicht gerade manuell ausgewählt ist
                    if (stein !== ersterStein) {
                        mesh.material[0].color.setHex(farbeOben);
                    } else {
                        mesh.material[0].color.setHex(farbeHighlight);
                    }
                }, 3000);
            }
        });
    }
}

function togglePause() {
    if (spielBeendet) { neuesSpielStarten(); return; }
    istPause = !istPause;
    document.getElementById('overlay').style.display = istPause ? 'flex' : 'none';
    document.getElementById('endMessage').innerText = "Pause";
    document.getElementById('overlayBtn').innerText = "Weiter spielen";
    document.getElementById('overlayBtn').onclick = togglePause;
    mainGroup.visible = !istPause;
    if (!istPause) startTimer(); else clearInterval(timerInterval);
}

function updateVolume(val) {
    aktuelleLautstaerke = parseFloat(val); localStorage.setItem('mahjongVolume', aktuelleLautstaerke);
    const volLabel = document.getElementById('volValue'); if (volLabel) volLabel.innerText = Math.round(aktuelleLautstaerke * 100) + "%";
}

function updateZoom(val) {
    // Umkehrlogik: Max (25) + Min (10) = 35. 
    // Wir ziehen den Slider-Wert von der Summe ab, um die Funktion umzudrehen.
    let sliderVal = parseFloat(val);
    kameraZoom = 35 - sliderVal; 
    
    localStorage.setItem('mahjongZoom', sliderVal); // Wir speichern den Slider-Stand
    updateCamera();
}

function wechsleLayout(val) { aktuelleFigur = val; localStorage.setItem('mahjongLayout', val); init(); }
function updateScoreDisplay() { document.getElementById('score').innerText = punkte; }

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!istPause && !spielBeendet) {
            sekunden++;
            let m = Math.floor(sekunden / 60), s = sekunden % 60;
            const tElem = document.getElementById('timer');
            if (tElem) tElem.innerText = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
        }
    }, 1000);
}

function oeffneHighscore() { 
    document.getElementById('highscoreModal').style.display = 'block'; 
    zeigeBestenliste(); 
}

function schliesseHighscore(e) { 
    if (e) e.stopPropagation(); 
    document.getElementById('highscoreModal').style.display = 'none'; 
}

function zeigeBestenliste() {
    const scores = JSON.parse(localStorage.getItem('mahjongHighscores')) || [];
    const body = document.getElementById('highscoreBodyPopup');
    const saveBtn = document.getElementById('saveHighscoreBtn');
    if (!body) return;
    
    body.innerHTML = ""; // Das Tabellen-Innere leeren
    
    let displayScores = [...scores];
    let highlightIndex = -1;
    
    if (neuerHighscoreEintrag) {
        displayScores.push(neuerHighscoreEintrag);
        displayScores.sort((a, b) => b.punkte - a.punkte);
        displayScores = displayScores.slice(0, 10);
        highlightIndex = displayScores.findIndex(s => s === neuerHighscoreEintrag);
        if (saveBtn) saveBtn.style.display = 'block';
    } else {
        if (saveBtn) saveBtn.style.display = 'none';
    }

    for (let i = 0; i < 10; i++) {
        const row = body.insertRow(); // Erzeugt ein <tr>
        const platz = i + 1;
        const daten = displayScores[i];

        // Zelle 1: Platzierung
        const cellPlatz = row.insertCell(0);
        cellPlatz.textContent = platz + ".";
        if (!daten) cellPlatz.style.color = "#666";

        // Zelle 2: Name (oder Input bei neuem Highscore)
        const cellName = row.insertCell(1);
        if (i === highlightIndex && neuerHighscoreEintrag) {
            const input = document.createElement('input');
            input.type = "text";
            input.id = "newNameInput";
            input.className = "highscore-input";
            input.value = neuerHighscoreEintrag.name;
            input.placeholder = "Dein Name...";
            input.onkeydown = (event) => { if(event.key === 'Enter') finalisiereHighscoreSpeichern(); };
            cellName.appendChild(input);
            
            setTimeout(() => {
                input.focus();
                input.select();
            }, 100);
        } else {
            cellName.textContent = daten ? daten.name : "--";
        }

        // Zelle 3: Zeit
        const cellZeit = row.insertCell(2);
        cellZeit.textContent = daten ? daten.zeit : "--";

        // Zelle 4: Punkte
        const cellPunkte = row.insertCell(3);
        cellPunkte.textContent = daten ? daten.punkte : "--";
    }
}

function finalisiereHighscoreSpeichern() {
    const input = document.getElementById('newNameInput');
    if (!input || !neuerHighscoreEintrag) return;
    
    const name = input.value.trim() || "Spieler";
    neuerHighscoreEintrag.name = name;
    localStorage.setItem('mahjongPlayerName', name);
    
    let scores = JSON.parse(localStorage.getItem('mahjongHighscores')) || [];
    scores.push(neuerHighscoreEintrag);
    scores.sort((a, b) => b.punkte - a.punkte);
    scores = scores.slice(0, 10);
    
    localStorage.setItem('mahjongHighscores', JSON.stringify(scores));
    neuerHighscoreEintrag = null;
    zeigeBestenliste();
}

function pruefeUndBereiteHighscoreVor() {
    const restSteine = mainGroup.children.filter(g => g.visible && g.position.x < 500).length;
    if (restSteine > 0) return;

    const zeitString = document.getElementById('timer').innerText;
    const aktuellePunkte = parseInt(document.getElementById('score').innerText);
    const scores = JSON.parse(localStorage.getItem('mahjongHighscores')) || [];
    const istTop10 = scores.length < 10 || aktuellePunkte > (scores[scores.length-1]?.punkte || 0);
    
    if (istTop10) {
        const lastPlayerName = localStorage.getItem('mahjongPlayerName') || "";
        neuerHighscoreEintrag = { 
            name: lastPlayerName, 
            zeit: zeitString, 
            punkte: aktuellePunkte, 
            timestamp: Date.now() 
        };
    }
    oeffneHighscore();
}

function leereBestenliste(e) {
    if (e) e.stopPropagation();
    if (confirm("Möchtest du die Bestenliste wirklich unwiderruflich löschen?")) {
        localStorage.removeItem('mahjongHighscores');
        neuerHighscoreEintrag = null;
        zeigeBestenliste();
    }
}

function updateCamera() {
    const aspect = container.clientWidth / container.clientHeight; 
    const d = kameraZoom;
    camera.left = -d * aspect; camera.right = d * aspect; camera.top = d; camera.bottom = -d;
    camera.position.set(0, 0, 50); camera.lookAt(shiftX, shiftY, 0); camera.updateProjectionMatrix();
}

window.addEventListener('resize', () => { renderer.setSize(container.clientWidth, container.clientHeight); updateCamera(); });

// --- ANIMATION MIT 60 FPS BEGRENZUNG ---
let lastTime = 0;
const fpsLimit = 60;

function animate(now) {
    requestAnimationFrame(animate);
    const delta = now - lastTime;
    if (delta >= 1000 / fpsLimit) {
        lastTime = now - (delta % (1000 / fpsLimit));
        renderer.render(scene, camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('layoutSelect');
    if (sel) {
        const sortierteLayouts = [...meineLayouts].sort((a, b) => (layoutUebersetzungen[a]||a).localeCompare(layoutUebersetzungen[b]||b, 'de'));
        sortierteLayouts.forEach(l => {
            const o = document.createElement('option'); o.value = l; o.text = layoutUebersetzungen[l] || l;
            if (l === aktuelleFigur) o.selected = true; sel.appendChild(o);
        });
    }
    updateVolume(aktuelleLautstaerke);
    
    // Initialisierung des Zoom-Sliders ohne Text-Label
    const zSlider = document.getElementById('zoomSlider');
    if (zSlider) {
        // Wir laden den gespeicherten Slider-Stand (10-25) oder nutzen den Standardwert 18
        const gespeicherterWert = localStorage.getItem('mahjongZoom') || 18;
        zSlider.value = gespeicherterWert;
        
        // WICHTIG: Den geladenen Wert sofort für die Kamera-Variable umrechnen,
        // damit das Bild beim Start direkt den richtigen Zoom hat.
        kameraZoom = 35 - parseFloat(gespeicherterWert);
    }

    init(); animate(performance.now());
});