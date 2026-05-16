# Mahjong-Live Multiplayer

Online-Solitair-Mahjong Spiel (Node.js), Multiplayer.  
**Live-Demo:** [mahjong-treff.de](https://mahjong-treff.de)
**Hauptsprache:** Deutsch (English via auto-translation).

## Über dieses Projekt
Dieses Projekt ist ein browserbasiertes Solitär-Mahjong-Spiel mit Einzel- und Mehrspielermodus. Es basiert technisch auf Node.js und nutzt Three.js für die Darstellung.

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

## Installation
Eine detaillierte Anleitung zur Installation und Konfiguration (Datenbank, Node.js, Umgebungsvariablen) befindet sich in der Datei `INSTALL.txt`.

### Kurzübersicht:
1.  Abhängigkeiten installieren: `npm install`
2.  Datenbank aus `maria.sql` importieren.
3.  `.env` Datei basierend auf den eigenen Zugangsdaten erstellen.
4.  Server starten: `node server.js`
