// seasonalSchedule.js
// Enthält ausschließlich die Zeitraum-Logik: welche Animation ist wann aktiv.
// Ruft dafür Funktionen aus seasonalAnimations.js auf, kennt aber selbst
// keine Animationsdetails.

// Berechnet den 1. Advent für ein gegebenes Jahr
function getFirstAdvent(year) {
    const dec24 = new Date(year, 11, 24); // 11 = Dezember
    const dayOfWeek = dec24.getDay();
    const daysToSubtract = dayOfWeek + 21;
    return new Date(year, 11, 24 - daysToSubtract);
}

// Berechnet den 3. Advent für ein gegebenes Jahr
function getThirdAdvent(year) {
    const dec24 = new Date(year, 11, 24); // 11 = Dezember
    const dayOfWeek = dec24.getDay();
    const daysToSubtract = dayOfWeek + 7;
    return new Date(year, 11, 24 - daysToSubtract);
}

// Variablen für den Weihnachtszeitraum initialisieren
const currentYear = new Date().getFullYear();
const firstAdventDate = getFirstAdvent(currentYear);
firstAdventDate.setHours(0, 0, 0, 0); // Gültig ab 00:00:00 Uhr
const thirdAdventDate = getThirdAdvent(currentYear);
thirdAdventDate.setHours(0, 0, 0, 0); // Gültig ab 00:00:00 Uhr
const christmasEnd = new Date(currentYear, 11, 26, 23, 59, 59);
const snowEnd = new Date(currentYear + 1, 0, 6, 23, 59, 59);	

const SEASONAL_EVENTS = [
    {
        name: 'schneefall-weihnachten',
        startDate: firstAdventDate,
        endDate: snowEnd,
        activate: () => window.initSnowfall('user-area'),
        deactivate: () => window.stopSnowfall()
    },
    {
        name: 'schlitten-weihnachten',
        startDate: thirdAdventDate,
        endDate: christmasEnd,
        activate: () => window.startSantaSleighLoop('/shared/bilder/gifs/santa1.gif'),
        deactivate: () => window.stopSantaSleighLoop()
    }
    // Spätere Saisons (Ostern, Sommer, ...) kommen als weitere Objekte hier
    // dazu, gleiche Struktur: name, startDate, endDate, activate(), deactivate()
];

function isWithinDateRange(event) {
    const now = new Date();
    return now >= event.startDate && now <= event.endDate;
}

window.initSeasonalAnimations = function() {
    for (const event of SEASONAL_EVENTS) {
        if (isWithinDateRange(event)) {
            console.log("Saisonale Animation aktiv:", event.name);
            event.activate();
        } else {
            event.deactivate();
        }
    }
};