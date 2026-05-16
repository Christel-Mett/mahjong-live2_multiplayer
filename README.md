# Mahjong-Live Multiplayer 2.0

Online-Solitär-Mahjong Spiel (Node.js), Multiplayer.  
**Live-Demo:** [mahjong-treff.de](https://mahjong-treff.de)  
**Hauptsprache:** Deutsch (English via auto-translation).

## Über dieses Projekt
Dieses Projekt ist ein browserbasiertes Solitär-Mahjong-Spiel mit Einzel- und Mehrspielermodus. Es basiert technisch auf Node.js und nutzt Three.js für die 3D-Darstellung der Spielsteine sowie Socket.io für die Echtzeit-Synchronisation zwischen den Spielern.

## Version 2.0 – Modulare Architektur
Version 1.0 dieses Projekts war als monolithische Anwendung konzipiert: nahezu die gesamte Logik – Authentifizierung, Matchmaking, Spielverwaltung, Lobby und Datenbankzugriffe – war in einer einzigen `server.js` mit rund 850 Zeilen untergebracht.

Version 2.0 wurde von Grund auf neu strukturiert. Die `server.js` dient nun ausschließlich als schlanker Orchestrator, der die einzelnen Module lädt und verbindet. Die Logik ist auf spezialisierte Module aufgeteilt:

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
Ich verfüge über Grundkenntnisse im Scripting (Python, Bash, PHP), bin jedoch kein professioneller Full-Stack-Entwickler. Die Architektur und die komplexe Logik dieses Spiels – insbesondere die 3D-Visualisierung mit Three.js und die Echtzeit-Synchronisation – entstanden durch eine intensive, iterative Zusammenarbeit zwischen mir (als Architekt und Tester) und Künstlicher Intelligenz (als ausführende Instanz für den Code).

Dieser moderne Ansatz ermöglichte es mir, meine bestehenden Erfahrungen effizient zu nutzen und gleichzeitig technologische Hürden zu überspringen, für die normalerweise jahrelange spezialisierte Entwicklungserfahrung nötig wäre. Wer den Code analysiert, wird daher die Handschrift fortschrittlicher KI-Modelle finden, die nach meinen präzisen Vorgaben und durch mein kontinuierliches Feedback gesteuert wurden.

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
