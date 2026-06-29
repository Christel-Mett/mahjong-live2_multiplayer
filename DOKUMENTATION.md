# Dokumentation: Mahjong-Live Multiplayer 2.0

## Inhaltsverzeichnis
1. [Projektübersicht](#projektübersicht)
2. [Architektur](#architektur)
3. [Installation & Konfiguration](#installation--konfiguration)
4. [Module & Komponenten](#module--komponenten)
5. [Spielmechaniken](#spielmechaniken)
6. [Entwicklung](#entwicklung)
7. [Sicherheit](#sicherheit)
8. [Lizenzen & Credits](#lizenzen--credits)

---

## Projektübersicht

### Was ist Mahjong-Live Multiplayer 2.0?

Mahjong-Live Multiplayer 2.0 ist ein **browserbasiertes Solitär-Mahjong-Spiel** mit Multiplayer-Funktion, entwickelt mit modernen Web-Technologien. Das Spiel kombiniert klassisches Mahjong-Gameplay mit Echtzeit-Multiplayer über Socket.IO.

**Live-Demo:** [mahjong-treff.de](https://mahjong-treff.de)

### Hauptmerkmale
- ✅ **Mehrspielermodus**: Echtzeit-Spielpartien gegen andere Spieler
- ✅ **Benutzerkonten**: Registrierung, Login, Passwort-Reset
- ✅ **Lobby-System**: Chat, Benutzerliste, Bestenliste (Leaderboard)
- ✅ **Matchmaking**: Automatische Gegner-Suche mit verschiedenen Layout-Optionen
- ✅ **3D-Grafiken**: Three.js-basierte Visualisierung der Spielsteine
- ✅ **Responsive Design**: Spielbar auf Desktop und mobilen Geräten
- ✅ **Bot-Schutz**: Altcha-basierte CAPTCHA-Verifizierung

### Technologie-Stack

| Komponente | Technologie |
|---|---|
| **Laufzeit** | Node.js |
| **Web-Framework** | Express.js |
| **Echtzeit-Kommunikation** | Socket.IO |
| **3D-Rendering** | Three.js |
| **Datenbank** | MySQL / MariaDB |
| **Session-Management** | Express-Session (MySQL Store) |
| **Sicherheit** | Helmet, CSRF-Protection, bcrypt, Rate Limiting |
| **Bot-Schutz** | Altcha (CAPTCHA-Alternative) |
| **E-Mail** | Nodemailer |
| **Sprache** | JavaScript (Node.js & Frontend) |

---

## Architektur

### Version 2.0 – Modulare Struktur

Version 1.0 war monolithisch aufgebaut. Version 2.0 wurde komplett umstrukturiert mit einem **modularen, wartbaren Design**:

- **`server.js`** → Schlanker Orchestrator (nur ~450 Zeilen)
- **Spezialisierte Module** → Jedes Modul hat eine klar definierte Aufgabe
- **Zentrale Datenbank-Schnittstelle** → `dbInterface.js` für alle SQL-Operationen
- **Middleware & Controller** → Saubere Separation of Concerns

### Modulübersicht

```
server.js (Orchestrator)
├── authController.js       → Authentifizierung
├── dbInterface.js          → Datenbankzugriffe
├── userManager.js          → Benutzerverwaltung
├── lobbyController.js      → Lobby-Logik
├── matchmakingCore.js      → Gegner-Matchmaking
├── gameController.js       → Spielverwaltung
├── captcha.js              → Altcha-Verifizierung
└── auth.js                 → Session-Middleware
```

### Abhängigkeitsdiagramm

```
Client (Browser)
    ↓
Socket.IO ← Express.js Server (server.js)
    ├── authController + auth.js
    ├── userManager
    ├── lobbyController
    ├── matchmakingCore
    ├── gameController
    └── dbInterface → MySQL/MariaDB
```

---

## Installation & Konfiguration

### Systemanforderungen
- **Node.js** 16+ 
- **MySQL/MariaDB** 5.7+
- **npm** oder yarn

### Schritt 1: Repository klonen

```bash
git clone https://github.com/Christel-Mett/mahjong-live2_multiplayer.git
cd mahjong-live2_multiplayer
```

### Schritt 2: Abhängigkeiten installieren

```bash
npm install
```

Die installierten Pakete sind in `package.json` definiert:

| Paket | Version | Zweck |
|---|---|---|
| **express** | ^5.2.1 | Web-Framework |
| **socket.io** | ^4.8.3 | Echtzeit-Kommunikation |
| **mysql2** | ^3.22.2 | MySQL-Datenbanktreiber |
| **bcrypt** | ^6.0.0 | Passwort-Hashing |
| **nodemailer** | ^8.0.6 | E-Mail-Versand |
| **helmet** | ^8.1.0 | HTTP-Security-Header |
| **express-rate-limit** | ^8.5.1 | Request-Rate-Limiting |
| **express-session** | ^1.19.0 | Session-Management |
| **express-mysql-session** | ^3.0.3 | MySQL-basierter Session-Store |
| **cookie-parser** | ^1.4.7 | Cookie-Parsing |
| **csrf-csrf** | ^2.3.0 | CSRF-Schutz |
| **dotenv** | ^17.4.2 | Umgebungsvariablen |
| **axios** | ^1.15.2 | HTTP-Client |
| **altcha-lib** | ^1.4.1 | CAPTCHA-Lösung (Bot-Schutz) |

### Schritt 3: Datenbank einrichten

1. **Datenbank erstellen:**
   ```sql
   CREATE DATABASE mahjong_live2;
   ```

2. **SQL-Skript ausführen:**
   ```bash
   mysql -u root -p mahjong_live2 < maria.sql
   ```

   Dies erstellt alle notwendigen Tabellen:
   - `users` → Benutzerdaten & Statistiken
   - `sessions` → Express-Session-Speicher
   - `leaderboard` → Rangliste
   - `game_logs` → Spielverlauf (optional)

### Schritt 4: Umgebungsvariablen konfigurieren

Erstelle eine `.env`-Datei im Projekt-Root:

```env
# Datenbank
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=dein_passwort
DB_NAME=mahjong_live2
DB_PORT=3306

# Session
SESSION_SECRET=dein_super_geheimes_secret_hier

# Port
PORT=3020

# E-Mail (Passwort-Reset)
MAIL_HOST=mail.example.com
MAIL_PORT=465
MAIL_USER=noreply@example.com
MAIL_PASS=dein_mail_passwort

# Altcha CAPTCHA
ALTCHA_SECRET=dein_altcha_secret_hier
```

### Schritt 5: Server starten

```bash
node server.js
```

**Erwartete Ausgabe:**
```
Server läuft auf Port 3020
```

Öffne dann `http://localhost:3020` im Browser.

---

## Module & Komponenten

### 1. **authController.js** – Authentifizierung

Behandelt alle Authentifizierungs-Vorgänge über Socket.IO-Events:

**Events:**
- `register_attempt` → Neue Benutzer registrieren
- `login_attempt` → Benutzer anmelden
- `forgot_password_attempt` → Passwort-Reset einleiten
- `reset_password_final` → Neues Passwort speichern

**Funktionen:**
- ✓ E-Mail-Verifizierung (Verification-Link)
- ✓ Sichere Passwort-Speicherung (bcrypt)
- ✓ Rate-Limiting (max. 20 Login-Versuche in 15 Min.)
- ✓ Session-Management
- ✓ Token-basierter Passwort-Reset
- ✓ Altcha-CAPTCHA-Verifizierung

**Beispiel-Flow (Registrierung):**
```
User → register_attempt
       ↓
       authController.handleRegister()
       ├─ Altcha-Token validieren
       ├─ E-Mail-Validierung
       ├─ Duplikat-Check
       ├─ Passwort hashen (bcrypt)
       ├─ In DB speichern
       └─ E-Mail mit Verifizierungs-Link senden
```

### 2. **dbInterface.js** – Zentrale Datenbank-Schnittstelle

Alle Datenbankzugriffe laufen durch dieses Modul. Dies ermöglicht:
- 🔒 SQL-Injection-Prävention (Prepared Statements)
- 📊 Zentrale Fehlerbehandlung
- 🔄 Konsistente Datenbank-API

**Wichtige Funktionen:**
- `getUsersByNames(names, callback)` → Benutzerdaten laden
- `updateUserPoints(username, points, callback)` → Punkte aktualisieren
- `getLeaderboard(limit, callback)` → Top-Spieler abrufen
- `saveGameResult(data, callback)` → Spielergebnis speichern
- `getMaxRang(callback)` → Höchster Rang im System

**Beispiel:**
```javascript
dbInterface.getUsersByNames(['spieler1', 'spieler2'], (err, results) => {
    if (err) console.error('DB-Fehler:', err);
    else console.log('Benutzer gefunden:', results);
});
```

### 3. **userManager.js** – Benutzerverwaltung

Verwaltet **aktive Online-Benutzer** während einer Session.

**In-Memory-Struktur:**
```javascript
{
    spieler1: {
        socketId: 'socket123',
        location: 'lobby'    // lobby | ingame
    },
    spieler2: {
        socketId: 'socket456',
        location: 'ingame'
    }
}
```

**Funktionen:**
- `addUser(username, socketId, location)` → Benutzer online registrieren
- `removeUser(username)` → Benutzer offline nehmen
- `getUser(username)` → Benutzerstatus abrufen
- `getUsernameBySocketId(socketId)` → Socket → Username Mapping
- `updateLocation(username, location)` → Status aktualisieren (lobby/ingame)

**Wofür wird das benötigt?**
- Nachverfolgung wer online ist
- Socket-ID-Mapping für sichere Kommunikation
- Lobby-Userliste aktualisieren
- Automatische Offline-Erkennung

### 4. **lobbyController.js** – Lobby-System

Verwaltet die zentrale Lobby, wo Spieler sich treffen, chatten und auf Matchmaking warten.

**Events:**
- `join_lobby` → Betritt die Lobby
- `send_chat_message` → Lobby-Chat
- `get_leaderboard` → Top-10 Spieler abrufen

**Funktionen:**
- Benutzer-Online-Liste aktualisieren
- Globaler Chat mit Zeitstempel
- Ranglisten-Display
- Spielerstatistiken abrufen

**Chat-Datenstruktur:**
```javascript
{
    user: "spieler1",
    text: "Guten Tag!",
    time: "14:30"
}
```

### 5. **matchmakingCore.js** – Gegner-Matchmaking

Intelligentes System zur Paarung von Spielern:

**Zwei Warteschlangen:**
1. **Zufalls-Queue** (`join_queue`)
   - Spieler wartet auf zufälligen Gegner
   - Kann beliebiges Layout spielen

2. **Layout-Queue** (`join_layout_queue`)
   - Spieler wählt spezifisches Layout
   - Wartet auf Gegner für dieses Layout

**Matchmaking-Logik:**
```
1. Spieler in Queue hinzufügen
   ↓
2. Alle 2 Sekunden:
   ├─ Layout-Queue matchen (gleiches Layout)
   ├─ Cross-Queue matchen (Falls Timeout)
   └─ Zufalls-Queue matchen (beliebig)
   ↓
3. Gegner gefunden → Raum erstellen
```

**Ranking-Faktor:**
- Spieler werden bevorzugt mit ähnlichem Rang (score) gematcht
- `maxRang` wird alle 60 Sekunden aktualisiert

### 6. **gameController.js** – Spielverwaltung

Verwaltung aktiver Spielpartien:

**Events:**
- `joinRoom` → Spieler betritt einen Spielraum
- `playerMove` → Zug wird gespielt (Steine nehmen)
- `gameFinished` → Spiel ist vorbei

**Funktionen:**
- Spielraum-Verwaltung (`room_<socket1>_<socket2>`)
- Punkte-Berechnung
- **Grace-Period**: 5 Sekunden zum Wiederverbinden bei Disconnect
- "Leichen-Check": Erkennt inaktive Spieler
- Spielergebnis speichern

**Grace-Period Mechanism:**
```
Spieler disconnected
    ↓
Grace-Period (5 Sekunden)
    ├─ Spieler reconnected → Weiterspielen ✓
    └─ Timeout → Spieler verliert ✗
```

**Punkte-System:**
```javascript
{
    zeit: 120,              // Spielzeit in Sekunden
    steine_genommen: 144,   // Anzahl Steine genommen
    points: 2400            // Berechnete Punkte
}
```

### 7. **auth.js** – Session-Middleware

Express-Middleware zur Authentifizierung geschützter Routen:

```javascript
app.get('/lobby', authMiddleware, (req, res) => {
    // Nur authentifizierte Benutzer
});
```

**Prüfung:**
- ✓ Session existiert
- ✓ `session.username` ist gesetzt
- ✓ Benutzer ist in der Datenbank

**Bei Fehler:** Redirect zu Login

### 8. **captcha.js** – Altcha-Verifizierung

Schützt vor automatisierter Registrierung & Bot-Angriffen durch die moderne CAPTCHA-Alternative **Altcha**.

**Warum Altcha statt Google reCaptcha?**
- 🔒 Datenschutzfreundlich: Keine externen Google-Server
- 🚀 Schneller: Lokal verarbeitete Challenge-Response
- 💡 Benutzerfreundlich: Weniger störend als traditionelle CAPTCHAs
- 🌍 Open Source: Transparente Lösung

**Verwendung:**
- Bei Registrierung
- Bei Passwort-Reset (optional)

**Server-seitige Validierung:**
```javascript
const { verifySignature } = require('altcha-lib');
const isValid = verifySignature(payload, secret);
```

---

## Spielmechaniken

### Spielablauf

```
1. LOBBY-PHASE
   ├─ Benutzer meldet sich an
   ├─ Betritt die Lobby
   └─ Sieht andere Online-Spieler

2. QUEUE-PHASE
   ├─ Klickt "Matchmaking"
   ├─ Wartet in Queue
   └─ Server sucht passenden Gegner

3. SPIEL-PHASE
   ├─ Server startet Spiel mit seed
   ├─ Beide Spieler sehen 3D-Steine
   ├─ Spieler nehmen Steine (playerMove)
   ├─ Client berechnet Score
   └─ Spieler mit den meisten Punkten gewinnt

4. ERGEBNIS-PHASE
   ├─ Punkte in DB speichern
   ├─ Rang-Berechnung
   └─ Zurück zur Lobby
```

### Layouts (Level-Varianten)

Das Spiel bietet **17 verschiedene Stein-Anordnungen**:

```javascript
['arrow', 'balance', 'bug', 'chip', 'eagle', 'enterprise', 
 'flowers', 'future', 'garden', 'glade', 'helios', 
 'inner_circle', 'km', 'mesh', 'rocket', 'the_door', 'time_tunnel']
```

Jedes Layout hat unterschiedliche:
- Schwierigkeitsgrad
- Visuelles Design

### Echtzeit-Synchronisation

**Socket.IO sendet kontinuierlich:**
- Layout-Statistiken (`layout_stats_update`) → Wer spielt wo
- Benutzerlisten (`update_layout_userlist`) → Spieler im Layout
- Chat-Nachrichten (`receive_room_chat_message`) → Ingame-Chat
- Match-Infos (`match_found`) → Gegner & Spieldetails

---

## Entwicklung

### Entwicklungs-Philosophie: Vibecoding

Dieses Projekt wurde mit **Vibecoding** entwickelt – ein moderner Ansatz, der:
- 🎨 Kreativität mit Struktur kombiniert
- 🤖 KI-Assistenten (wie Claude) für komplexe Logik nutzt
- ⚡ Schnelle Iterationen ermöglicht
- 🚀 Technische Hürden überbrückt

**Hinweis des Autors:** Der Entwickler hat Grundkenntnisse in Scripting (Python, Bash, PHP), ist aber kein professioneller Entwickler. Trotzdem wurde ein komplexes, produktives System durch eine Kombination aus Grundfähigkeiten und KI-Unterstützung realisiert.

### Projekt-Struktur

```
mahjong-live2_multiplayer/
├── server.js                    # Hauptserver (Orchestrator)
├── package.json                 # Abhängigkeiten
├── .env.example                 # Template für Umgebungsvariablen
├── maria.sql                    # Datenbank-Schema
│
├── Controllers/Modules:
│   ├── authController.js        # Authentifizierung
│   ├── lobbyController.js       # Lobby
│   ├── gameController.js        # Spielverwaltung
│   ├── matchmakingCore.js       # Matchmaking
│   ├── userManager.js           # Online-Benutzerliste
│   ├── dbInterface.js           # Datenbank-API
│   ├── captcha.js               # Altcha CAPTCHA
│   └── auth.js                  # Session-Middleware
│
├── Frontend:
│   ├── index.html               # Login/Registrierung
│   ├── reset-password.html      # Passwort-Reset
│   ├── lobby.html               # Lobby-Interface
│   ├── style.css                # Global-Styles
│   │
│   ├── /auswahl/
│   │   ├── index.html           # Layout-Auswahl
│   │   └── lobby-auswahl.html   # Layout-Lobby
│   │
│   ├── /multi/
│   │   └── index.html           # Multiplayer-Spiel
│   │
│   ├── /single/
│   │   └── index.html           # Singleplayer (ohne Login aufrufbar)
│   │
│   └── /shared/
│       └── [Gemeinsame Assets]
```

### Wichtige HTTP-Routen

```javascript
GET  /                 # Login-Seite
GET  /verify           # E-Mail-Verifizierung
GET  /logout           # Abmelden
GET  /reset-password   # Passwort-Reset-Seite
GET  /lobby            # Lobby (geschützt)
GET  /auswahl/         # Layout-Auswahl (geschützt)
GET  /multi/           # Multiplayer-Spiel (geschützt)

POST /set-session      # Session fixieren (Login)
POST /csrf-token       # CSRF-Token abrufen
```

### Wichtige Socket.IO-Events

**Authentifizierung:**
- `register_attempt` → Server
- `login_attempt` → Server
- `forgot_password_attempt` → Server
- `reset_password_final` → Server
- `login_response` ← Server

**Lobby:**
- `join_lobby` → Server
- `send_chat_message` → Server
- `get_leaderboard` → Server
- `receive_chat_message` ← Server (broadcast)

**Matchmaking:**
- `join_queue` → Server
- `join_layout_queue` → Server
- `cancel_layout_queue` → Server
- `layout_stats_update` ← Server (broadcast)
- `match_found` ← Server

**Spiel:**
- `joinRoom` → Server
- `playerMove` → Server
- `gameFinished` → Server
- `receive_room_chat_message` ← Server

---

## Sicherheit

### Implementierte Sicherheitsmaßnahmen

#### 1. **Helmet.js** – HTTP-Security-Header
```javascript
Content-Security-Policy
├─ script-src: Nur trusted sources
├─ frame-src: Nur HTTPS iframes
└─ worker-src: Web Worker nur von eigene Domäne
```

#### 2. **CSRF-Schutz**
```javascript
// Token-basiert
GET /csrf-token           # Token abrufen
POST /set-session         # Token in Header: X-CSRF-Token
    ├─ Validierung erfolgt
    └─ Session fixiert
```

#### 3. **Rate-Limiting**

**Login (15 Minuten Fenster):**
```
- Max. 20 Versuche pro IP
- Message: "Zu viele Anfragen. Bitte warte 15 Minuten."
```

**Seiten (1 Minute Fenster):**
```
- Max. 60 Requests pro IP
- Message: "Zu viele Anfragen. Bitte kurz warten."
```

#### 4. **Passwort-Sicherheit**
```
Benutzer-Eingabe
    ↓
bcrypt.hash(passwort, 10)  # Salt rounds: 10
    ↓
Hash in DB speichern        # Original nie gespeichert!
    ↓
Bei Login: bcrypt.compare() # Sicherer Vergleich
```

#### 5. **Session-Management**
```javascript
sessionMiddleware {
    key: 'mahjong_session'
    secret: process.env.SESSION_SECRET
    cookie: {
        secure: true        // Nur HTTPS
        maxAge: 86400000    // 24 Stunden
    }
    store: MySQLStore       // Persistente Sessions
}
```

#### 6. **SQL-Injection-Prävention**
```javascript
// ✓ SICHER: Prepared Statement
db.query('SELECT * FROM users WHERE username = ?', [username])

// ✗ UNSICHER: String-Konkatenation
db.query('SELECT * FROM users WHERE username = ' + username)
```

#### 7. **Altcha-CAPTCHA-Verifizierung**
- Bei Registrierung
- Schützt vor automatisierten Bot-Attacken
- Datenschutzfreundlich (keine externen Google-Server)
- Challenge-Response-Protokoll lokal verifiziert

#### 8. **E-Mail-Verifizierung**
```
Registrierung
    ↓
E-Mail mit Verification-Link
    ↓
Link-Klick (Token-Validierung)
    ↓
Account aktiviert
```

### Sicherheits-Checkliste für Production

- [ ] `.env`-Datei wird nicht in Git committed
- [ ] `SESSION_SECRET` ist ein starker, zufälliger String
- [ ] `ALTCHA_SECRET` ist korrekt konfiguriert
- [ ] HTTPS/TLS ist aktiviert (Nginx/Apache als Reverse Proxy)
- [ ] Datenbank-Backups sind konfiguriert
- [ ] E-Mail-Versand mit TLS/SSL
- [ ] Regelmäßige Security-Updates für npm-Pakete
- [ ] Logging & Monitoring ist eingerichtet
- [ ] Firewall blockiert direkte MySQL-Zugriffe

---

## Lizenzen & Credits

### Lizenz
Dieses Projekt ist unter der **GNU General Public License (GPL) v3** veröffentlicht.

### Drittanbieter-Assets

| Komponente | Quelle | Lizenz |
|---|---|---|
| **Stein-Symbole & Layouts** | KMahjongg (KDE Games) | GPL |
| **Hintergrund-Grafik** | "Chinese Landscape" © Eugene Trounev | GPL |
| **3D-Engine** | Three.js | MIT |
| **Web-Framework** | Express.js | MIT |
| **Socket.IO** | Socket.IO Team | MIT |
| **CAPTCHA-Lösung** | Altcha | MIT |

**Siehe auch:** `CREDITS.txt` im Repository

### Danksagungen

- **KDE Games Team** für das KMahjongg-Projekt
- **Three.js Community** für die großartige 3D-Bibliothek
- **Altcha Team** für die moderne CAPTCHA-Lösung
- Alle Contributors und Tester

---

## Weitere Ressourcen

- **Live-Demo:** [mahjong-treff.de](https://mahjong-treff.de)
- **GitHub:** [Christel-Mett/mahjong-live2_multiplayer](https://github.com/Christel-Mett/mahjong-live2_multiplayer)
- **Node.js Docs:** [nodejs.org](https://nodejs.org)
- **Express Docs:** [expressjs.com](https://expressjs.com)
- **Socket.IO Docs:** [socket.io](https://socket.io)
- **Three.js Docs:** [threejs.org](https://threejs.org)
- **Altcha Docs:** [altcha.com](https://altcha.com)

---

**Dokumentation erstellt:** Mai 2026  
**Letzte Aktualisierung:** Juni 2026  
**Version:** 2.0 (Modulare Architektur)  
**Autor:** Christel-Mett
