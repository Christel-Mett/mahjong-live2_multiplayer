// chat-auswahl.js
let chatSocket;

window.sendMessage = function() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    const text = chatInput.value;
    if (text && text.trim() !== "" && chatSocket) {
        chatSocket.emit('send_room_chat_message', text);
        chatInput.value = "";
        chatInput.focus();
    }
};

function initChat(socket) {
    chatSocket = socket;
    const meinName = localStorage.getItem('mahjongPlayerName') || 'Spieler';

    // Wichtig: Identität beim Server bestätigen
    socket.emit('re-identify', meinName);

    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chatInput');

    socket.on('receive_room_chat_message', (data) => {
        appendMessage(data);
    });

    socket.on('chat_history', (history) => {
        if (chatMessages) {
            chatMessages.innerHTML = '';
            history.forEach(data => appendMessage(data));
        }
    });

    function appendMessage(data) {
        if (!chatMessages) return;
        const msgDiv = document.createElement('div');
        msgDiv.style.marginBottom = '8px';
        msgDiv.style.fontSize = '0.95em';
        
        const istMeinName = data.user === localStorage.getItem('mahjongPlayerName');
        const nameColor = istMeinName ? '#2ecc71' : '#d2b48c';

        msgDiv.innerHTML = `<span style="color: #888; font-size: 0.8em;">[${data.time}]</span> <strong style="color: ${nameColor}">${data.user}:</strong> <span></span>`;
        msgDiv.querySelector('span:last-child').textContent = data.text;
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.sendMessage();
        });
    }
}
