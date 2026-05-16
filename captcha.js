const axios = require('axios');

async function verifyCaptcha(token) {
    if (!token) return false;

    try {
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${token}`
        );
        console.log("Google Antwort:", response.data); // Temporär zum Debuggen
        // Bei v3 prüfen wir auf success und optional auf einen Mindest-Score (z.B. 0.5)
        return response.data.success && response.data.score >= 0.4;
    } catch (error) {
        console.error("ReCaptcha Fehler:", error);
        return false;
    }
}

module.exports = { verifyCaptcha };
