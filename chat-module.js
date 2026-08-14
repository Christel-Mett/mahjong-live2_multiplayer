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
// Basis-Liste ohne das Bier (Index 13 ist nun frei für das Wechselemoji)
const emojiListBase = [
    '😊', '😂', '😉', '😍', '🤔', '🥵️', '😎', '😮', '😢', '🤮️', '👍', '👎', '🤘️', 
    '💪️', '🙏️', '✨', '🎉', '👋', '🔥', '🍀', '🎲', '💩️', '🎮', '⌛', '🀄'
];

function getTimeBasedEmoji() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return '☕'; 
    if (hour >= 11 && hour < 15) return '🥤'; 
    if (hour >= 15 && hour < 18) return '🍹️'; 
    return '🍺';
}

function getHeartEmoji() {
    const now = new Date();
    // Stunden in Viertelstunden umrechnen + aktuelle Viertelstunden dazuaddieren
    const quarters = (now.getHours() * 4) + Math.floor(now.getMinutes() / 15);
    
    const heartType = quarters % 3;
    
    if (heartType === 0) return '❤️';  // Rot
    if (heartType === 1) return '🩷';  // Rosa
    return '💜';                       // Lila
}

// Hilfsfunktion, um die Liste inklusive Wechselemoji zu generieren
function getFullEmojiList() {
    const list = [...emojiListBase];
    // 1. Getränke-Emoji an Index 13 einfügen
    list.splice(15, 0, getTimeBasedEmoji());
    
    // 2. Herz-Emoji an Index 16 einfügen
    list.splice(16, 0, getHeartEmoji());
    return list;
}

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

    container.innerHTML = getFullEmojiList().map((e, i) =>
        `<span data-idx="${i}" style="margin-right: 12px; font-size: 1.4em; cursor: pointer; user-select: none;">${e}</span>`
    ).join('');

    container.addEventListener('click', (e) => {
        const idx = e.target.dataset.idx;
        if (idx !== undefined) {
            addEmoji(getFullEmojiList()[parseInt(idx)]);
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