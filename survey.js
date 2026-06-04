// survey.js
// Einbindung in server.js:
//   Im Routenteil:          app.get('/survey', pageLimiter, authMiddleware, (req, res) => res.sendFile(__dirname + '/survey.html'));
//   In io.on('connection'): require('./survey').handleSocket(socket);

const fs = require('fs');
const path = require('path');
const VOTES_FILE = path.join(__dirname, 'survey_votes.txt');

// Datei anlegen falls nicht vorhanden
if (!fs.existsSync(VOTES_FILE)) {
    fs.writeFileSync(VOTES_FILE, '');
    console.log('survey.js: survey_votes.txt angelegt.');
}

function hasVoted(username) {
    const content = fs.readFileSync(VOTES_FILE, 'utf8');
    return content.split('\n').some(line => line.split(',')[0] === username);
}

function saveVote(username, vote) {
    fs.appendFileSync(VOTES_FILE, `${username},${vote}\n`);
}

module.exports.handleSocket = (socket) => {
    const session = socket.request.session;

    socket.on('check_survey_status', () => {
        if (!session.username) return;
        socket.emit('survey_status', {
            hasVoted: hasVoted(session.username),
            username: session.username
        });
    });

    socket.on('submit_survey', (data) => {
        if (!session.username) {
            return socket.emit('survey_submit_response', { success: false, message: 'Nicht eingeloggt.' });
        }
        if (data.vote !== 'yes' && data.vote !== 'no') {
            return socket.emit('survey_submit_response', { success: false, message: 'Ungültige Auswahl.' });
        }
        if (hasVoted(session.username)) {
            return socket.emit('survey_submit_response', { success: false, message: 'Du hast bereits abgestimmt.' });
        }
        saveVote(session.username, data.vote);
        console.log(`survey.js: ${session.username} hat abgestimmt: ${data.vote}`);
        socket.emit('survey_submit_response', { success: true });
    });
};
