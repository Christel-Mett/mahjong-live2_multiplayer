# Mahjong-Live Multiplayer 2.0

Online-Solitär-Mahjong Spiel (Node.js), Multiplayer.  
**Live-Demo:** [mahjong-treff.de](https://mahjong-treff.de)  
**Hauptsprache:** Deutsch (English via auto-translation).

## Titelbild

[![Mahjong-Treff Title](shared/gitpics/mahjong2-treff.png)](shared/gitpics/mahjong2-treff.png)

## Über dieses Projekt
Dieses Projekt ist ein browserbasiertes Solitär-Mahjong-Spiel mit Einzel- und Mehrspielermodus. Es basiert technisch auf Node.js und nutzt Three.js für die 3D-Darstellung der Spielsteine sowie Socket.io für die Echtzeit-Kommunikation zwischen Client und Server.

## Spielfeatures

### Lobby & Chat
[![Mahjong-Treff Lobby](shared/gitpics/mahjong2-lobby.png)](shared/gitpics/mahjong2-lobby.png)

In der Lobby kannst du dich mit anderen Spielern unterhalten, Online-Nutzer sehen und aus verschiedenen Spielmodi wählen.

### Spielablauf
[![Mahjong Spielfeld](shared/gitpics/mahjong2-spielfeld.png)](shared/gitpics/mahjong2-spielfeld.png)

Das Kernspiel im Mehrspielermodus mit interaktiven Steinen und Live-Statistiken.

### Spielergebnis
[![Mahjong Ergebnis](shared/gitpics/mahjong2-ergebnis.png)](shared/gitpics/mahjong2-ergebnis.png)

Detaillierte Endergebnisse mit Platzierungen und Punktestand nach jeder Runde.

## Version 2.0 – Modulare Architektur
Version 1.0 dieses Projekts ([mahjong-live_multiplayer](https://github.com/Christel-Mett/mahjong-live_multiplayer/blob/main/README.md?plain=1)) war als monolithische Anwendung konzipiert: nahezu die gesamte Logik in einer oder zwei großen Dateien.

Version 2.0 wurde von Grund auf neu strukturiert. Die `server.js` dient nun ausschließlich als schlanker Orchestrator, der die einzelnen Module lädt und verbindet. Die Logik ist auf spezialisierte, austauschbare Module verteilt:

| Modul | Aufgabe |
|---|---|
| `authController.js` | Login, Registrierung, E-Mail-Verifizierung, Passwort-Reset |
| `dbInterface.js` | Alle Datenbankzugriffe zentral an einer Stelle |
| `userManager.js` | Verwaltung aktiver User, Socket-Mapping, Standortverfolgung |
| `lobbyController.js` | Lobby-Join, Chat, Userliste, Bestenliste |
| `matchmakingCore.js` | Zufalls- und Layout-Matchmaking mit Mehrstufenlogik |
| `gameController.js` | Spielraumverwaltung, Punkte, Grace-Period, Leichen-Check |
| `captcha.js` | Captcha-Verifikation |
| `auth.js` | Session-Schutz als Middleware |

Diese Struktur macht den Code wartbarer, testbarer und erweiterbar – ohne die Spiellogik oder das Frontend anzufassen.

## Entwicklung & Methodik
Dieses Projekt wurde unter Anwendung von **Vibecoding** realisiert.

Wichtiger Hinweis zum Hintergrund:
Ich verfüge über Grundkenntnisse im Scripting (Python, Bash, PHP), bin jedoch kein professioneller Full-Stack-Entwickler. Die Architektur und die komplexe Logik dieses Spiels – insbesondere die Matchmaking- und Punkte-Berechnung – wurden mit moderner KI-Unterstützung entwickelt.

Dieser moderne Ansatz ermöglichte es mir, meine bestehenden Erfahrungen effizient zu nutzen und gleichzeitig technologische Hürden zu überspringen, für die normalerweise jahrelange spezialisierte Erfahrung erforderlich wäre.

## Rechtliches & Lizenzen
Dieses Projekt ist Open Source und unter der **GNU General Public License (GPL) v3** veröffentlicht.

* **Grafiken:** Die Steinsymbole und Layouts basieren auf dem "KMahjongg"-Projekt (KDE Games).
* **Hintergrund:** "Chinese Landscape" © Eugene Trounev (GPL).
* **Engine:** Nutzt Three.js (MIT Lizenz).

Weitere Details findest du in der `CREDITS.txt`.

## Kurzübersicht Installation
1. Abhängigkeiten installieren: `npm install`
2. Datenbank aus `maria.sql` importieren.
3. `.env` Datei basierend auf den eigenen Zugangsdaten erstellen.
4. Server starten: `node server.js`
