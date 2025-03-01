const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Exponiere geschützte Methoden für den Renderer-Prozess
contextBridge.exposeInMainWorld('electronAPI', {
  // Empfange Datei-Öffnen-Events
  onFileOpened: (callback) => {
    ipcRenderer.on('file-opened', (_, filePath) => callback(filePath));
  },
  
  // Lese CSV-Datei
  readFile: (filePath) => {
    return new Promise((resolve, reject) => {
      try {
        // Stelle sicher, dass der Pfad ein String ist
        if (typeof filePath !== 'string') {
          return reject(new Error('Dateipfad muss ein String sein'));
        }
        
        // Lese die Datei als UTF-8 Text
        fs.readFile(filePath, 'utf8', (err, data) => {
          if (err) {
            console.error('Fehler beim Lesen der Datei:', err);
            reject(err);
          } else {
            console.log(`Datei gelesen: ${filePath}, ${data.length} Bytes`);
            resolve(data);
          }
        });
      } catch (error) {
        console.error('Unerwarteter Fehler beim Lesen der Datei:', error);
        reject(error);
      }
    });
  },
  
  // Dark Mode einstellen
  setDarkMode: (isDark) => {
    ipcRenderer.send('set-dark-mode', isDark);
  }
});

console.log('Preload-Skript ausgeführt, Electron API für Renderer-Prozess verfügbar');