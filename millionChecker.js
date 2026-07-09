// millionChecker.js
// Kapselt: Punkte speichern + prüfen, ob ein Spieler dabei erstmals die Millionengrenze überschreitet.

const dbInterface = require('./dbInterface');

// Zum Testen auf Staging einfach diesen Wert anpassen.
const MILLIONEN_GRENZE = 1000000;

module.exports = {
    /**
     * Speichert die Punkte eines Spielers und meldet zurück, ob dabei
     * die Millionengrenze erstmals überschritten wurde.
     *
     * @param {string} username
     * @param {number} points - im aktuellen Spiel erzielte Punkte
     * @param {function} callback - (err, result) => { result = { millionCracked: boolean } }
     */
    saveGameResult: (username, points, callback) => {
        dbInterface.getUserRankAndPoints(username, (err, rows) => {
            if (err) {
                return callback(err);
            }

            const alterStand = (rows && rows[0] && typeof rows[0].mp_points === 'number')
                ? rows[0].mp_points
                : 0;

            dbInterface.updateUserPoints(username, points, (err) => {
                if (err) {
                    return callback(err);
                }

                const neuerStand = alterStand + points;
                const millionCracked = (alterStand < MILLIONEN_GRENZE) && (neuerStand >= MILLIONEN_GRENZE);

                callback(null, { millionCracked });
            });
        });
    }
};
