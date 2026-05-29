// authController.js
const dbInterface = require('./dbInterface');
const userManager = require('./userManager');
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = {
    // Verarbeitet den Registrierungsversuch (socket.on('register_attempt'))
handleRegister: (socket, data, transporter) => {
    const { username, password, email } = data;
    const token = Math.random().toString(36).substr(2);

    dbInterface.checkUserExists(username, email, async (err, results) => {
        if (err) return socket.emit('register_response', { success: false, message: 'Datenbankfehler.' });
        if (results.length > 0) {
            return socket.emit('register_response', { success: false, message: 'Nutzername oder E-Mail existiert bereits.' });
            
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        dbInterface.insertUser(username, hashedPassword, email, token, (err) => {
            if (err) return socket.emit('register_response', { success: false, message: 'Fehler beim Speichern.' });
            
            // --- ÄNDERUNG: SOFORTIGE ANTWORT AN DEN CLIENT ---
            socket.emit('register_response', { 
                success: true, 
                message: 'Registrierung erfolgreich! Bitte prüfe in Kürze dein E-Mail-Postfach zur Verifizierung.' 
            });
                console.log(`Neue Registrierung: ${username} (${email}).`);
                
            // --- MAIL-VERSAND LÄUFT JETZT IM HINTERGRUND ---
            const verifyLink = `https://2.staging.mahjong-treff.de/verify?token=${token}`;
            const mailOptions = {
                from: `"Mahjong-Treff" <${process.env.MAIL_USER}>`,
                to: email,
                subject: 'Registrierung bestätigen',
                html: `<p>Vielen Dank für deine Registrierung! Klicke hier, um dein Konto zu aktivieren:</p><a href="${verifyLink}">E-Mail verifizieren</a>`
            };

            // Der Callback wird nur noch für internes Logging genutzt
            transporter.sendMail(mailOptions, (mailErr) => {
                if (mailErr) {
                    console.error("Hintergrund-Mail-Versand Fehler:", mailErr);
                    // Optional: Hier könnte man dem User später eine Notifikation senden, 
                    // falls die Mail permanent fehlschlägt.
                }
            });
        });
    });
},

    // Verarbeitet den Loginversuch (socket.on('login_attempt'))
    handleLogin: (socket, data, session) => {
        const { username, password } = data;

        dbInterface.getUserByUsername(username, (err, results) => {
            if (err) return socket.emit('login_response', { success: false, message: 'Datenbankfehler.' });
            
            if (results.length === 0) {
                return socket.emit('login_response', { success: false, message: 'Falscher Nutzername oder Passwort.' });
            }

            const user = results[0];

            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err || !isMatch) {
                	  console.log(`Fehlgeschlagener Login für: ${username}.`);
                    return socket.emit('login_response', { success: false, message: 'Falscher Nutzername oder Passwort.' });
                }

                if (user.is_verified === 0) {
                    return socket.emit('login_response', { success: false, message: 'Bitte verifiziere erst deine E-Mail.' });
                }

                // Session-Daten setzen
                session.username = user.username;
                session.userId = user.id;
                
                // Mit Callback speichern, um Fehler abzufangen
                session.save((err) => {
                    if (err) {
                        console.error("Session-Save-Fehler:", err);
                        return socket.emit('login_response', { success: false, message: 'Verbindungsfehler beim Erstellen der Sitzung.' });
                    }

                    userManager.addUser(user.username, socket.id, 'lobby');
                    console.log(`Benutzer ${user.username} eingeloggt.`);

                    dbInterface.updateLoginTimestamp(user.id, () => {
                        socket.emit('login_response', { success: true, username: user.username });
                    });
                });
            });
        });
    },

    // Verarbeitet die Verifizierung per URL-Aufruf (app.get('/verify'))
    handleVerify: (req, res) => {
        const token = req.query.token;
        dbInterface.verifyUser(token, (err, results) => {
            if (err || results.affectedRows === 0) {
                return res.send("Verifizierung fehlgeschlagen oder Token ungültig.");
            }
            res.send("E-Mail erfolgreich verifiziert! Du kannst dich jetzt einloggen.");
        });
    },

    // Teil 1: Mail-Anfrage für Passwort-Reset
    handleForgotPassword: (socket, email, transporter) => {
        dbInterface.getUserByEmail(email, (err, results) => {
            if (err || results.length === 0) {
                return socket.emit('forgot_password_response', { success: true, message: 'Anleitung wurde gesendet, falls die E-Mail existiert.' });
            }

            const resetToken = require('crypto').randomBytes(32).toString('hex');
            dbInterface.updateUserToken(results[0].id, resetToken, (updateErr) => {
                if (updateErr) return;

                const resetLink = `https://2.staging.mahjong-treff.de/reset-password?token=${resetToken}`;
                const mailOptions = {
                    from: `"Mahjong-Treff" <${process.env.MAIL_USER}>`,
                    to: email,
                    subject: 'Passwort zurücksetzen',
                    html: `<p>Klicke hier, um dein Passwort zu ändern:</p><a href="${resetLink}">Passwort zurücksetzen</a>`
                };

                transporter.sendMail(mailOptions, () => {
                    socket.emit('forgot_password_response', { success: true, message: 'Anleitung wurde gesendet.' });
                });
            });
        });
    },

    // Teil 2: Finales Speichern des neuen Passworts
    handleResetFinal: (socket, data) => {
        const { token, newPassword } = data;
        dbInterface.getUserByToken(token, async (err, results) => {
            if (err || results.length === 0) {
                return socket.emit('reset_password_response', { success: false, message: 'Link ungültig.' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            dbInterface.updatePasswordAndClearToken(results[0].id, hashedPassword, (updErr) => {
                if (updErr) return socket.emit('reset_password_response', { success: false, message: 'Fehler.' });
                socket.emit('reset_password_response', { success: true });
            });
        });
    }
};