// authController.js
const dbInterface = require('./dbInterface');
const userManager = require('./userManager');
const bcrypt = require('bcrypt');
const i18next = require('i18next');
const saltRounds = 10;

module.exports = {
    // Verarbeitet den Registrierungsversuch (socket.on('register_attempt'))
handleRegister: (socket, data, transporter) => {
    const { username, password, email } = data;
    //const token = Math.random().toString(36).substr(2);
    const token = require('crypto').randomBytes(32).toString('hex');

    dbInterface.checkUserExists(username, email, async (err, results) => {
        if (err) return socket.emit('register_response', { success: false, message: i18next.t('auth.dbError', { lng: socket.lang }) });
        if (results.length > 0) {
            return socket.emit('register_response', { success: false, message: i18next.t('auth.nameStillexist', { lng: socket.lang }) });
            
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        dbInterface.insertUser(username, hashedPassword, email, token, (err) => {
            if (err) return socket.emit('register_response', { success: false, message: i18next.t('auth.savingFailure', { lng: socket.lang }) });
            
            // --- ÄNDERUNG: SOFORTIGE ANTWORT AN DEN CLIENT ---
            socket.emit('register_response', { 
                success: true, 
                message: i18next.t('auth.registrationSuccess', { lng: socket.lang }) 
            });
                console.log(`Neue Registrierung: ${username} (${email}).`);
                
            // --- MAIL-VERSAND LÄUFT JETZT IM HINTERGRUND ---
            const verifyLink = `${process.env.APP_URL}/verify?token=${token}`;
            const mailOptions = {
                from: `"Mahjong-Treff" <${process.env.MAIL_USER}>`,
                to: email,
                subject: i18next.t('mail.subjectConfirmregistration', { lng: socket.lang }),
                html: i18next.t('mail.htmlConfirmregistration', { lng: socket.lang, verifyLink: verifyLink })
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
            if (err) return socket.emit('login_response', { success: false, message: i18next.t('auth.dbError', { lng: socket.lang }) });
            
            if (results.length === 0) {
                return socket.emit('login_response', { success: false, message: i18next.t('auth.wrongUser', { lng: socket.lang }) });
            }

            const user = results[0];

            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err || !isMatch) {
                	  console.log(`Fehlgeschlagener Login für: ${username}.`);
                    return socket.emit('login_response', { success: false, message: i18next.t('auth.wrongUser', { lng: socket.lang }) });
                }

                if (user.is_verified === 0) {
                    return socket.emit('login_response', { success: false, message: i18next.t('auth.verifyMail', { lng: socket.lang }) });
                }

                // Session-Daten setzen
                session.username = user.username;
                session.userId = user.id;
                
                // Mit Callback speichern, um Fehler abzufangen
                session.save((err) => {
                    if (err) {
                        console.error("Session-Save-Fehler:", err);
                        return socket.emit('login_response', { success: false, message: i18next.t('auth.sessionError', { lng: socket.lang }) });
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
    	  const lang = req.cookies.lang || 'de';
        const token = req.query.token;
        dbInterface.verifyUser(token, (err, results) => {
            if (err || results.affectedRows === 0) {
               
                return res.send(i18next.t('auth.verifyingFailure', { lng: lang }));
            }
            res.send(i18next.t('auth.verifyingSuccess', { lng: lang }));
        });
    },

    // Teil 1: Mail-Anfrage für Passwort-Reset
    handleForgotPassword: (socket, email, transporter) => {
        dbInterface.getUserByEmail(email, (err, results) => {
            if (err || results.length === 0) {
                return socket.emit('forgot_password_response', { success: true, message: i18next.t('auth.mailSend1', { lng: socket.lang }) });
            }

            const resetToken = require('crypto').randomBytes(32).toString('hex');
            dbInterface.updateUserToken(results[0].id, resetToken, (updateErr) => {
                if (updateErr) return;

                const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
                const mailOptions = {
                    from: `"Mahjong-Treff" <${process.env.MAIL_USER}>`,
                    to: email,
                    subject: i18next.t('mail.subjectResetpassword', { lng: socket.lang }),
                    html: i18next.t('mail.htmlResetpassword', { lng: socket.lang, resetLink: resetLink })
                };

                transporter.sendMail(mailOptions, () => {
                    socket.emit('forgot_password_response', { success: true, message: i18next.t('auth.mailSend2', { lng: socket.lang }) });
                });
            });
        });
    },

    // Teil 2: Finales Speichern des neuen Passworts
    handleResetFinal: (socket, data) => {
        const { token, newPassword } = data;
        dbInterface.getUserByToken(token, async (err, results) => {
            if (err || results.length === 0) {
                return socket.emit('reset_password_response', { success: false, message: i18next.t('auth.linkFalse', { lng: socket.lang }) });
            }

            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            dbInterface.updatePasswordAndClearToken(results[0].id, hashedPassword, (updErr) => {
                if (updErr) return socket.emit('reset_password_response', { success: false, message: i18next.t('auth.error', { lng: socket.lang }) });
                socket.emit('reset_password_response', { success: true });
            });
        });
    }
};