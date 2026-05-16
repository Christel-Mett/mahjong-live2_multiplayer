// chat-module.js
let chatSocket; 

window.sendMessage = function() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) {
        console.error("Chat-Eingabefeld nicht gefunden!");
        return;
    }
    
    const text = chatInput.value;
    if (text && text.trim() !== "") {
        if (chatSocket && chatSocket.connected) {
            console.log("Sende Nachricht:", text);
            chatSocket.emit('send_chat_message', text);
            chatInput.value = "";
            chatInput.focus();
        } else {
            alert("Chat-Fehler: Socket ist nicht verbunden!");
        }
    }
};

// --- Emoji-Konfiguration ---
const emojiList = [
    '😊', '😂', '😉', '😍', '🤔', '😎', '😮', '😢', '🤮️', '👍', '👎', '🤘️', '🙏️', 
    '🔥', '✨', '🎉', '👋', '❤️', '🍀', '🎲', '💩️', '🎮', '⌛',
    '🀄'// Mahjong-spezifische Emojis
];

window.scrollEmojis = function(distance) {
    const container = document.getElementById('emoji-container');
    if (container) {
        container.scrollBy({
            left: distance,
            behavior: 'smooth' // Sorgt für ein sanftes Gleiten
        });
    }
};

window.addEmoji = function(emoji) {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value += emoji;
        chatInput.focus();
    }
};

function renderEmojiPicker() {
    const container = document.getElementById('emoji-container');
    if (!container) return;

    container.innerHTML = emojiList.map((e, i) => 
        `<span data-idx="${i}" style="margin-right: 12px; font-size: 1.4em; cursor: pointer; user-select: none;">${e}</span>`
    ).join('');

    container.addEventListener('click', (e) => {
        const idx = e.target.dataset.idx;
        if (idx !== undefined) {
            addEmoji(emojiList[parseInt(idx)]);
        }
    });
}
// ---------------------------
function initChat(socket) {
    chatSocket = socket;
    console.log("Chat-Modul initialisiert. ID:", socket.id);
    
	 renderEmojiPicker();    
    
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chatInput');

    socket.on('receive_chat_message', (data) => {
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
        // --- NEU: Client-seitige Begrenzung ---
	    // Wenn mehr als 50 Nachrichten-Elemente im Chat sind, lösche das älteste
	    while (chatMessages.children.length > 50) {
	        chatMessages.removeChild(chatMessages.firstChild);
    }
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.sendMessage();
        });
    }
}