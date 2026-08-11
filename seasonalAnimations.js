// seasonalAnimations.js
// Enthält die einzelnen saisonalen Animationen. Jede Funktion ist unabhängig
// aufrufbar und kennt selbst kein Datum - die Zeitraum-Logik steckt in
// seasonalSchedule.js.

// --- Schneefall-Konfiguration ---
// Hier kannst du die Optik in Ruhe feintunen.
const SNOW_CONFIG = {
    flakeCount: 60,          // Anzahl gleichzeitig fallender Flocken
    flakeSizeMin: 2,         // kleinster Flocken-Radius (px)
    flakeSizeMax: 4,         // größter Flocken-Radius (px)
    fallSpeedMin: 0.4,       // langsamste Fallgeschwindigkeit (px pro Frame)
    fallSpeedMax: 1.2,       // schnellste Fallgeschwindigkeit (px pro Frame)
    taumelFaktor: 0.6,       // Stärke des seitlichen "Tänzelns" beim Fallen (0 = keins)
    columnWidth: 4,          // Breite einer "Boden-Spalte" für die Schneehöhe (px)
    growthFactor: 10,         // Höhenzuwachs pro Flocken-Landung (vor Kompression)
    compactionScale: 15,     // Je größer, desto länger wächst die Decke ungebremst, bevor sie sich "zusammendrückt"
    smoothingStrength: 0.15, // Stärke der Glättung pro Durchlauf (0 = aus, 1 = sehr stark)
    smoothingPasses: 2,      // Wie oft die Glättung pro Frame läuft (mehr = Schnee "verläuft" schneller/weiter seitlich)
    edgeMargin: 40           // Unsichtbarer Überstand links/rechts (px), wo die Rand-Keile entstehen dürfen
};

let snowCanvas = null;
let snowCtx = null;
let snowFlakes = [];
let snowColumnHeights = [];
let snowAnimationFrameId = null;

window.initSnowfall = function(containerId = 'user-area') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Schneefall: Container nicht gefunden:", containerId);
        return;
    }
    // Container muss als Bezugsrahmen für das Canvas-Overlay dienen
    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === 'static') {
        container.style.position = 'relative';
    }
    // Überstand des Canvas außerhalb der Box abschneiden, dort entstehen die Rand-Keile
    container.style.overflow = 'hidden';
    const margin = SNOW_CONFIG.edgeMargin;
    const extendedWidth = container.clientWidth + margin * 2;
    snowCanvas = document.createElement('canvas');
    snowCanvas.style.position = 'absolute';
    snowCanvas.style.top = '0';
    snowCanvas.style.left = -margin + 'px';
    snowCanvas.style.width = extendedWidth + 'px';
    snowCanvas.style.height = '100%';
    snowCanvas.style.pointerEvents = 'none';
    container.appendChild(snowCanvas);
    snowCanvas.width = extendedWidth;
    snowCanvas.height = container.clientHeight;
    snowCtx = snowCanvas.getContext('2d');
    const columnCount = Math.ceil(snowCanvas.width / SNOW_CONFIG.columnWidth);
    snowColumnHeights = new Array(columnCount).fill(0);
    const avgSpeed = (SNOW_CONFIG.fallSpeedMin + SNOW_CONFIG.fallSpeedMax) / 2;
    const maxDelayFrames = snowCanvas.height / avgSpeed;
    snowFlakes = [];
    for (let i = 0; i < SNOW_CONFIG.flakeCount; i++) {
        snowFlakes.push(createSnowflake(0, Math.random() * maxDelayFrames));
    }
    runSnowAnimation();
};

window.stopSnowfall = function() {
    if (snowAnimationFrameId) {
        cancelAnimationFrame(snowAnimationFrameId);
        snowAnimationFrameId = null;
    }
    if (snowCanvas && snowCanvas.parentNode) {
        snowCanvas.parentNode.removeChild(snowCanvas);
    }
    snowCanvas = null;
    snowCtx = null;
    snowFlakes = [];
    snowColumnHeights = [];
};

function createSnowflake(startY = 0, spawnDelay = 0) {
    return {
        x: Math.random() * snowCanvas.width,
        y: startY,
        radius: SNOW_CONFIG.flakeSizeMin + Math.random() * (SNOW_CONFIG.flakeSizeMax - SNOW_CONFIG.flakeSizeMin),
        speed: SNOW_CONFIG.fallSpeedMin + Math.random() * (SNOW_CONFIG.fallSpeedMax - SNOW_CONFIG.fallSpeedMin),
        taumelOffset: Math.random() * Math.PI * 2, // Startpunkt der Tänzel-Bewegung
        taumelSpeed: 0.02 + Math.random() * 0.02,
        spawnDelay: spawnDelay // Frames, die die Flocke noch "unsichtbar wartet", bevor sie zu fallen beginnt
    };
}

// Eine Flocke wächst nur in ihrer eigenen Spalte. Das seitliche "Verlaufen"
// übernimmt komplett smoothSnowGround().
function depositSnow(col) {
    if (col < 0 || col >= snowColumnHeights.length) return;
    const currentHeight = snowColumnHeights[col];
    const compaction = 1 / (1 + currentHeight / SNOW_CONFIG.compactionScale);
    snowColumnHeights[col] += SNOW_CONFIG.growthFactor * compaction;
}

// Glättung zwischen Nachbarspalten. Die Rand-Ungleichmäßigkeit, die dadurch
// zwangsläufig entsteht, landet jetzt im unsichtbaren edgeMargin-Bereich.
function smoothSnowGround() {
    const len = snowColumnHeights.length;
    if (len < 3) return;

    const smoothed = new Array(len);
    for (let i = 0; i < len; i++) {
        const left = snowColumnHeights[Math.max(0, i - 1)];
        const right = snowColumnHeights[Math.min(len - 1, i + 1)];
        const neighborAvg = (left + right) / 2;
        smoothed[i] = snowColumnHeights[i] + (neighborAvg - snowColumnHeights[i]) * SNOW_CONFIG.smoothingStrength;
    }
    snowColumnHeights = smoothed;
}

function drawSnowGround() {
    if (snowColumnHeights.length === 0) return;

    snowCtx.beginPath();
    snowCtx.moveTo(0, snowCanvas.height);

    for (let col = 0; col < snowColumnHeights.length; col++) {
        const x = col * SNOW_CONFIG.columnWidth + SNOW_CONFIG.columnWidth / 2;
        const y = snowCanvas.height - snowColumnHeights[col];

        if (col === 0) {
            snowCtx.lineTo(x, y);
        } else {
            const prevX = (col - 1) * SNOW_CONFIG.columnWidth + SNOW_CONFIG.columnWidth / 2;
            const prevY = snowCanvas.height - snowColumnHeights[col - 1];
            const midX = (prevX + x) / 2;
            const midY = (prevY + y) / 2;
            snowCtx.quadraticCurveTo(prevX, prevY, midX, midY);
        }
    }

    snowCtx.lineTo(snowCanvas.width, snowCanvas.height);
    snowCtx.closePath();
    snowCtx.fillStyle = '#ffffff';
    snowCtx.fill();
}

function runSnowAnimation() {
    if (!snowCtx) return;
    for (let p = 0; p < SNOW_CONFIG.smoothingPasses; p++) {
        smoothSnowGround();
    }
    snowCtx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
    // Liegengebliebenen Schnee zeichnen (als durchgehende Fläche, nicht als Balken)
    drawSnowGround();
    // Fallende Flocken zeichnen & bewegen
    snowCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (const flake of snowFlakes) {
        if (flake.spawnDelay > 0) {
            flake.spawnDelay--;
            continue;
        }
        flake.taumelOffset += flake.taumelSpeed;
        flake.x += Math.sin(flake.taumelOffset) * SNOW_CONFIG.taumelFaktor;
        flake.y += flake.speed;
        const col = Math.min(
            snowColumnHeights.length - 1,
            Math.max(0, Math.floor(flake.x / SNOW_CONFIG.columnWidth))
        );
        const groundLevel = snowCanvas.height - snowColumnHeights[col];
        if (flake.y >= groundLevel) {
            depositSnow(col);
            Object.assign(flake, createSnowflake());
            continue;
        }
        snowCtx.beginPath();
        snowCtx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        snowCtx.fill();
    }
    snowAnimationFrameId = requestAnimationFrame(runSnowAnimation);
}

// Ende der Schneefallanimation
//
//
//
// ============================================================================
// BEGINN SCHLITTENANIMATION
// ============================================================================

// --- Schlitten-Konfiguration ---
// Hier kannst du Timing und Optik in Ruhe feintunen.
const SLEIGH_CONFIG = {
    initialDelayMax: 30000,      // Erste Fahrt startet zufällig innerhalb dieser Zeitspanne nach dem Laden (ms)
    nextFlightDelayMin: 60000,   // Kürzester Abstand bis zur nächsten Fahrt (ms)
    nextFlightDelayMax: 240000,  // Längster Abstand bis zur nächsten Fahrt (ms)
    hiddenTabRetryMin: 60000,    // Falls Tab im Hintergrund: kürzester Abstand bis zum nächsten Versuch (ms)
    hiddenTabRetryMax: 240000,   // Falls Tab im Hintergrund: längster Abstand bis zum nächsten Versuch (ms)
    flightDuration: 10000,       // Dauer der sichtbaren Flugstrecke über den Bildschirm (ms)
    soundLeadIn: 500,            // Vorlauf des Glöckchen-Sounds, bevor der Schlitten sichtbar wird (ms)
    audioFadeDuration: 500,      // Dauer des Ein-/Ausblendens der Glöckchen-Lautstärke (ms)
    sleighVolume: 0.2,           // Maximale Lautstärke der Glöckchen (0 - 1)
    hohohoWindowStart: 3000,     // HoHoHo-Sound frühestens ab diesem Zeitpunkt nach Glöckchen-Start (ms)
    hohohoWindowSpan: 4000,      // ... und spätestens innerhalb dieser zusätzlichen Zeitspanne danach (ms)
    imageMaxWidth: 300,          // Maximale Breite des Schlitten-Bilds (px)
    edgeMargin: 350              // Abstand außerhalb des Bildschirms, an dem der Schlitten startet/endet (px)
};

let sleighTimerId = null;
let sleighAnimationFrameId = null;
let sleighElement = null;
let sleighStartDelayId = null;
let hohohoTimeoutId = null;
let sleighAudioStopTimeoutId = null;
let sleighAudio = null;
let hohohoAudio = null;

window.startSantaSleighLoop = function(gifPath = '/shared/bilder/gifs/santa1.gif') {
    window.stopSantaSleighLoop();

    const initialDelay = Math.random() * SLEIGH_CONFIG.initialDelayMax;
    sleighTimerId = setTimeout(() => {
        runSleighFlight(gifPath);
    }, initialDelay);
};

window.stopSantaSleighLoop = function() {
    if (sleighTimerId) {
        clearTimeout(sleighTimerId);
        sleighTimerId = null;
    }
    if (sleighStartDelayId) {
        clearTimeout(sleighStartDelayId);
        sleighStartDelayId = null;
    }
    if (hohohoTimeoutId) {
        clearTimeout(hohohoTimeoutId);
        hohohoTimeoutId = null;
    }
    if (sleighAudioStopTimeoutId) {
        clearTimeout(sleighAudioStopTimeoutId);
        sleighAudioStopTimeoutId = null;
    }
    if (sleighAnimationFrameId) {
        cancelAnimationFrame(sleighAnimationFrameId);
        sleighAnimationFrameId = null;
    }
    if (sleighElement && sleighElement.parentNode) {
        sleighElement.parentNode.removeChild(sleighElement);
    }
    sleighElement = null;

    if (sleighAudio) {
        sleighAudio.pause();
        sleighAudio = null;
    }
    if (hohohoAudio) {
        hohohoAudio.pause();
        hohohoAudio = null;
    }
};

function fadeAudioIn(audio, durationMs = SLEIGH_CONFIG.audioFadeDuration, maxVolume = SLEIGH_CONFIG.sleighVolume) {
    audio.volume = 0;
    const steps = 20;
    const intervalTime = durationMs / steps;
    let step = 0;
    const timer = setInterval(() => {
        step++;
        audio.volume = Math.min(maxVolume, (step / steps) * maxVolume);
        if (step >= steps) {
            clearInterval(timer);
        }
    }, intervalTime);
}

function fadeAudioOutAndStop(audio, durationMs = SLEIGH_CONFIG.audioFadeDuration) {
    if (!audio) return;
    const startVol = audio.volume;
    const steps = 20;
    const intervalTime = durationMs / steps;
    let step = 0;
    const timer = setInterval(() => {
        step++;
        audio.volume = Math.max(0, startVol * (1 - step / steps));
        if (step >= steps) {
            clearInterval(timer);
            audio.pause();
        }
    }, intervalTime);
}

function runSleighFlight(gifPath) {
    // Wenn der Tab im Hintergrund liegt, keinen Sound/Flug starten, sondern direkt neu ansetzen
    if (document.hidden) {
        const nextDelay = SLEIGH_CONFIG.hiddenTabRetryMin + Math.random() * (SLEIGH_CONFIG.hiddenTabRetryMax - SLEIGH_CONFIG.hiddenTabRetryMin);
        sleighTimerId = setTimeout(() => {
            runSleighFlight(gifPath);
        }, nextDelay);
        return;
    }

    // 1. Glöckchen-Sound sofort mit Loop starten und einblenden
    sleighAudio = new Audio('/shared/sound/animation/sleigh-bells2.mp3');
    sleighAudio.loop = true;
    sleighAudio.play().catch(err => console.log('Glöckchen Audio-Wiedergabe blockiert:', err));
    fadeAudioIn(sleighAudio, SLEIGH_CONFIG.audioFadeDuration, SLEIGH_CONFIG.sleighVolume);

    // Sound-Ende unabhängig von der Bildschirm-Animation per Timeout steuern
    sleighAudioStopTimeoutId = setTimeout(() => {
        fadeAudioOutAndStop(sleighAudio, SLEIGH_CONFIG.audioFadeDuration);
    }, SLEIGH_CONFIG.soundLeadIn + SLEIGH_CONFIG.flightDuration);

    // 2. HoHoHo-Sound zufällig in der Flugmitte einplanen
    const hohohoDelay = SLEIGH_CONFIG.soundLeadIn + SLEIGH_CONFIG.hohohoWindowStart + Math.random() * SLEIGH_CONFIG.hohohoWindowSpan;
    hohohoTimeoutId = setTimeout(() => {
        hohohoAudio = new Audio('/shared/sound/animation/hohoho.mp3');
        hohohoAudio.play().catch(err => console.log('HoHoHo Audio-Wiedergabe blockiert:', err));
    }, hohohoDelay);

    // 3. Erst nach dem Vorlauf für das Glöckchenklingeln startet die sichtbare Schlittenfahrt
    sleighStartDelayId = setTimeout(() => {
        if (sleighElement && sleighElement.parentNode) {
            sleighElement.parentNode.removeChild(sleighElement);
        }

        sleighElement = document.createElement('img');
        sleighElement.src = gifPath;
        sleighElement.style.position = 'fixed';
        sleighElement.style.top = '0px';
        sleighElement.style.left = '0px';
        sleighElement.style.zIndex = '9999';
        sleighElement.style.pointerEvents = 'none';
        sleighElement.style.maxWidth = SLEIGH_CONFIG.imageMaxWidth + 'px';
        sleighElement.style.height = 'auto';
        document.body.appendChild(sleighElement);

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const margin = SLEIGH_CONFIG.edgeMargin;

        const fromRightToLeft = Math.random() < 0.5;

        let startX, endX;
        if (fromRightToLeft) {
            startX = screenWidth + margin;
            endX = -margin;
        } else {
            startX = -margin;
            endX = screenWidth + margin;
        }

        const startY = screenHeight * (0.1 + Math.random() * 0.7);
        const endY = screenHeight * (0.1 + Math.random() * 0.7);

        const deltaX = endX - startX;
        const deltaY = endY - startY;

        const angleDeg = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        let transformCss = '';
        if (fromRightToLeft) {
            const rot = angleDeg > 0 ? angleDeg - 180 : angleDeg + 180;
            transformCss = `rotate(${rot}deg)`;
        } else {
            transformCss = `rotate(${angleDeg}deg) scaleX(-1)`;
        }

        sleighElement.style.transform = transformCss;
        sleighElement.style.transformOrigin = 'center center';

        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / SLEIGH_CONFIG.flightDuration, 1);

            const currentX = startX + deltaX * progress;
            const currentY = startY + deltaY * progress;

            if (sleighElement) {
                sleighElement.style.left = `${currentX}px`;
                sleighElement.style.top = `${currentY}px`;
            }

            if (progress < 1) {
                sleighAnimationFrameId = requestAnimationFrame(animate);
            } else {
                // Bild ist komplett aus dem Screen verschwunden
                if (sleighElement && sleighElement.parentNode) {
                    sleighElement.parentNode.removeChild(sleighElement);
                }
                sleighElement = null;

                // Folgefahrt in zufälligem Abstand
                const nextDelay = SLEIGH_CONFIG.nextFlightDelayMin + Math.random() * (SLEIGH_CONFIG.nextFlightDelayMax - SLEIGH_CONFIG.nextFlightDelayMin);
                sleighTimerId = setTimeout(() => {
                    runSleighFlight(gifPath);
                }, nextDelay);
            }
        }

        sleighAnimationFrameId = requestAnimationFrame(animate);

    }, SLEIGH_CONFIG.soundLeadIn);
}

// ============================================================================
// ENDE SCHLITTENANIMATION
// ============================================================================