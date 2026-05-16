const mysql = require('mysql2');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// EINSTELLUNGEN
const SIMULATION_MODE = false; // Auf 'false' setzen, um scharf zu schalten
const INACTIVE_MONTHS = 6;
const GRACE_PERIOD_DAYS = 7;

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: true,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

async function runCleanup() {
    console.log(`[${new Date().toLocaleString()}] Starte Cleanup... (Modus: ${SIMULATION_MODE ? 'SIMULATION' : 'LIVE'})`);

    // TEIL 1: Warn-Mails versenden (Inaktiv seit 6 Monaten)
    const warnSql = `
        SELECT id, username, email FROM users 
        WHERE last_login < DATE_SUB(NOW(), INTERVAL ? MONTH) 
        AND deletion_warning_sent IS NULL
    `;

    db.query(warnSql, [INACTIVE_MONTHS], async (err, usersToWarn) => {
        if (err) return console.error("Fehler bei Warn-Abfrage:", err);

        for (const user of usersToWarn) {
            console.log(`-> Sende Warnung an: ${user.username} (${user.email})`);
            
            if (!SIMULATION_MODE) {
                const mailOptions = {
                    from: `"Mahjong-Treff" <${process.env.MAIL_USER}>`,
                    to: user.email,
                    subject: 'Dein Mahjong-Account wird bald gelöscht',
                    text: `Hallo ${user.username},\n\ndu warst seit über 6 Monaten nicht mehr eingeloggt. Wenn du dich nicht innerhalb der nächsten ${GRACE_PERIOD_DAYS} Tage einmal anmeldest, wird dein Account aus Sicherheitsgründen gelöscht.\n\nDein Mahjong-Team`
                };

                try {
                    await transporter.sendMail(mailOptions);
                    db.query("UPDATE users SET deletion_warning_sent = NOW() WHERE id = ?", [user.id]);
                } catch (sendErr) {
                    console.error(`Fehler beim Mailversand an ${user.email}:`, sendErr);
                }
            } else {
                console.log(`   [SIM] Warn-Mail an ${user.username} unterdrückt.`);
                db.query("UPDATE users SET deletion_warning_sent = NOW() WHERE id = ?", [user.id]);
            }
        }
    });

    // TEIL 2: Löschen (Warnung ist älter als 7 Tage)
    const deleteSql = `
        SELECT id, username FROM users 
        WHERE deletion_warning_sent < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    db.query(deleteSql, [GRACE_PERIOD_DAYS], (err, usersToDelete) => {
        if (err) return console.error("Fehler bei Lösch-Abfrage:", err);

        for (const user of usersToDelete) {
            console.log(`!! Löschung fällig für: ${user.username}`);
            
            if (!SIMULATION_MODE) {
                db.query("DELETE FROM users WHERE id = ?", [user.id], (delErr) => {
                    if (!delErr) console.log(`   [DELETED] User ${user.username} entfernt.`);
                });
            } else {
                console.log(`   [SIM] Würde User ${user.username} jetzt löschen.`);
            }
        }
    });
    
    // TEIL 3: Unverifizierte Accounts nach 24h löschen
    const unverifiedSql = `
        DELETE FROM users 
        WHERE is_verified = 0 
        AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)
    `;
    
    db.query(unverifiedSql, (err, result) => {
        if (err) return console.error("Fehler bei Unverifiziert-Löschung:", err);
        if (result && result.affectedRows > 0) {
            console.log(`[CLEANUP] ${result.affectedRows} unverifizierte Accounts nach 24h entfernt.`);
        }
    });

// TEIL 4: Verifizierte Accounts ohne Erst-Login nach 7 Tagen löschen
    const verifiedNoLoginSql = `
        DELETE FROM users 
        WHERE is_verified = 1 
        AND last_login IS NULL 
        AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    
    db.query(verifiedNoLoginSql, (err, result) => {
        if (err) return console.error("Fehler bei Löschung verifizierter Null-Logins:", err);
        if (result && result.affectedRows > 0) {
            console.log(`[CLEANUP] ${result.affectedRows} verifizierte Accounts ohne Erst-Login nach 7 Tagen entfernt.`);
        }
    });
}

// Skript ausführen
runCleanup().then(() => {
    // Kurze Verzögerung vor dem Schließen, damit Mails sicher rausgehen
    setTimeout(() => db.end(), 5000);
});