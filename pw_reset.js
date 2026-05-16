const crypto = require('crypto');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Teil 1: Mail mit Link senden (Hattest du schon)
function handleForgotPassword(socket, db, email, transporter) {
    db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) {
            socket.emit('forgot_password_response', { success: true, message: 'Falls diese E-Mail existiert, wurde ein Link gesendet.' });
            return;
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        db.query('UPDATE users SET token = ? WHERE email = ?', [resetToken, email], (updateErr) => {
            if (updateErr) return console.error('DB Fehler:', updateErr);

            const resetLink = `https://staging.mahjong-treff.de/reset-password?token=${resetToken}`;
            const mailOptions = {
                from: `"Mahjong-Treff" <${process.env.MAIL_USER}>`,
                to: email,
                subject: 'Passwort zurücksetzen',
                html: `<p>Klicke hier, um dein Passwort zu ändern:</p><a href="${resetLink}">Passwort zurücksetzen</a>`
            };

            transporter.sendMail(mailOptions, (mailErr) => {
                socket.emit('forgot_password_response', { success: true, message: 'Anleitung wurde gesendet.' });
            });
        });
    });
}

// NEU - Teil 2: Das neue Passwort in der DB speichern
function handleResetFinal(socket, db, data) {
    const { token, newPassword } = data;

    if (!token) {
        return socket.emit('reset_password_response', { success: false, message: 'Ungültiger Token.' });
    }

    // 1. User anhand des Tokens finden
    db.query('SELECT id FROM users WHERE token = ?', [token], async (err, results) => {
        if (err || results.length === 0) {
            return socket.emit('reset_password_response', { success: false, message: 'Link abgelaufen oder ungültig.' });
        }

        const userId = results[0].id;

        // 2. Neues Passwort hashen
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // 3. Passwort speichern und Token löschen (Sicherheit!)
        db.query('UPDATE users SET password = ?, token = NULL WHERE id = ?', [hashedPassword, userId], (updErr) => {
            if (updErr) {
                return socket.emit('reset_password_response', { success: false, message: 'Datenbankfehler.' });
            }
            // Erfolg an den Browser melden
            socket.emit('reset_password_response', { success: true });
        });
    });
}

// WICHTIG: Beide Funktionen exportieren!
module.exports = { handleForgotPassword, handleResetFinal };