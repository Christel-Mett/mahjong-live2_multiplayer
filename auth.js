// auth.js - Die Türsteher-Logik für HTTP-Aufrufe
module.exports = function(req, res, next) {
    // Prüfen, ob eine Session existiert und eine userId (oder username) gesetzt ist
    if (req.session && req.session.username) {
        return next(); // Zugriff erlaubt
    }
    
    // Wenn nicht eingeloggt: Umleitung auf die Startseite (Login)
    res.redirect('/');
};
