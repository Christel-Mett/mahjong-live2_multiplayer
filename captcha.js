const { verifySolution } = require('altcha-lib');

const ALTCHA_SECRET = process.env.CAPTCHA_SECRET;

async function verifyCaptcha(payload) {
    if (!payload) {
        console.log("Altcha: Kein Payload empfangen – Registrierung abgelehnt.");
        return false;
    }

    try {
        const ok = await verifySolution(payload, ALTCHA_SECRET);
        if (ok) {
            console.log("Altcha: Prüfung erfolgreich.");
        } else {
            console.log("Altcha: Prüfung fehlgeschlagen – ungültiger Payload.");
        }
        return ok;
    } catch (error) {
        console.error("Altcha Fehler:", error);
        return false;
    }
}

module.exports = { verifyCaptcha };