# MoneyMind - Finance Analyzer

MoneyMind ist eine Desktop-Anwendung zur Analyse von Finanztransaktionen. Die Software ermöglicht das Importieren von CSV-Dateien verschiedener Banken, die Visualisierung von Einnahmen und Ausgaben sowie die langfristige Speicherung und Analyse finanzieller Aktivitäten.

## Features

- **CSV-Import:** Unterstützung für verschiedene Bankformate (Sparkasse, DKB, ING, Comdirect und generisches Format)
- **Transaktionsanalyse:** Automatische Kategorisierung und Zusammenfassung von Einnahmen und Ausgaben
- **Datenvisualisierung:** Grafische Darstellung der finanziellen Aktivitäten
- **Dark Mode:** Augenschonende Darstellung für Tag und Nacht
- **Lokale Datenspeicherung:** Alle Daten bleiben auf dem eigenen Computer (IndexedDB)
- **Cross-Platform:** Verfügbar für Windows und macOS

## Installation

### Voraussetzungen
- Node.js und npm (für Entwicklung)

### Schnellstart für Benutzer
1. Lade die neueste Version für dein Betriebssystem herunter:
   - [Windows (.exe)](https://github.com/username/moneymind/releases)
   - [macOS (.dmg)](https://github.com/username/moneymind/releases)
2. Installiere die Anwendung
3. Starte MoneyMind und beginne mit dem Import deiner Finanzdaten

## Für Entwickler

### Projekt einrichten
```bash
# Repository klonen
git clone https://github.com/username/moneymind.git
cd moneymind

# Abhängigkeiten installieren
npm install

# Anwendung starten
npm start
```

### Anwendung bauen
```bash
# Für Windows
npx electron-builder --win --x64 --force

# Für macOS
npx electron-builder --mac

# Alternativ mit electron-packager (einfachere Variante)
npx electron-packager . MoneyMind --platform=win32 --arch=x64 --overwrite
```

### Bekannte Probleme beim Bauen

1. **Symlink-Fehler unter Windows**
   ```
   ERROR: Cannot create symbolic link : A required privilege is not held by the client.
   ```
   
   Lösung: PowerShell oder CMD als Administrator ausführen oder symbolische Links in Windows aktivieren (siehe Windows-Dokumentation).

2. **Datei wird von einem anderen Prozess verwendet**
   ```
   remove resources\app.asar: The process cannot access the file because it is being used by another process.
   ```
   
   Lösung:
   - Alle Electron-Prozesse beenden: `taskkill /F /IM electron.exe`
   - Build-Verzeichnisse löschen: `rd /s /q dist`
   - Flag `--force` verwenden: `npx electron-builder --win --x64 --force`
   
3. **Probleme mit macOS-Builds unter Windows**
   
   Lösung: Verwende die plattformspezifischen Flags oder konfiguriere die package.json entsprechend.

## Anleitung für Benutzer

### CSV-Datei importieren

1. Klicke auf "Datei" → "CSV-Datei öffnen" oder verwende den Import-Bereich
2. Wähle eine CSV-Datei von deiner Bank aus
3. Die Anwendung erkennt automatisch das Format und importiert die Daten
4. Nach dem Import siehst du eine Zusammenfassung und Visualisierung

### Ergebnisse anzeigen

- Der "Auswertungen"-Tab zeigt Statistiken und Diagramme
- Einnahmen und Ausgaben werden farblich unterschieden
- Die Dateiliste zeigt alle bisher importierten Dateien

### Einstellungen anpassen

- Im "Einstellungen"-Tab kannst du den Dark Mode aktivieren/deaktivieren
- Weitere Anpassungen für die Analyse sind verfügbar

## Unterstützte CSV-Formate

MoneyMind kann CSV-Dateien von folgenden Banken verarbeiten:

- **Sparkasse**
- **Deutsche Kreditbank (DKB)**
- **ING**
- **Comdirect**
- **Generisches Format** (für andere Banken)

Sollte dein Bankformat nicht erkannt werden, wird ein generisches Format angenommen. Die Anwendung versucht die Struktur intelligent zu interpretieren.

## Technischer Hintergrund

MoneyMind basiert auf folgenden Technologien:

- **Electron** - Cross-Platform Desktop Framework
- **JavaScript/HTML/CSS** - Frontend
- **IndexedDB** - Lokale Datenbank
- **Chart.js** - Visualisierung

## Datenschutz

Alle Daten werden ausschließlich lokal auf deinem Computer gespeichert. Es werden keine Daten an Server gesendet oder extern verarbeitet.

## Neue Features in Version 0.3

- **Verbesserte CSV-Erkennung** für mehr Bankformate
- **Dark Mode** für augenschonendes Arbeiten
- **Fehlerbehandlung** für robusteren CSV-Import
- **Electron-Integration** für natürlicheres Desktop-Erlebnis
- **Performance-Optimierungen** für größere Datensätze

## Fehlerbehebung

### CSV-Import funktioniert nicht
- Überprüfe das Format deiner CSV-Datei
- Stelle sicher, dass die Datei nicht von einem anderen Programm geöffnet ist
- Bei unbekannten Formaten: Überprüfe die Spaltenköpfe deiner CSV-Datei

### Anwendung startet nicht
- Stelle sicher, dass dein Betriebssystem aktuell ist
- Bei Windows: Probiere die Ausführung als Administrator
- Bei Fehlermeldungen: Überprüfe die Konsole (F12 in der Entwicklerversion)

## Lizenz

MIT License - siehe LICENSE Datei für Details.

---

*MoneyMind Version 0.3.0*  
*©2025 Raphael*