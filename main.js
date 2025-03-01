const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

// Erstelle das Anwendungsfenster
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'src/assets/app-icon.png')
  });

  // Lade die index.html der App
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Erstelle das Menü
  const template = [
    {
      label: 'Datei',
      submenu: [
        {
          label: 'CSV-Datei öffnen',
          click: async () => {
            const { filePaths } = await dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [{ name: 'CSV Dateien', extensions: ['csv'] }]
            });
            if (filePaths && filePaths.length > 0) {
              // Stelle sicher, dass wir einen gültigen String-Pfad senden
              const validPath = filePaths[0].toString();
              console.log('Sende Dateipfad an Renderer:', validPath);
              mainWindow.webContents.send('file-opened', validPath);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Beenden' }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload', label: 'Neu laden' },
        { role: 'toggleDevTools', label: 'Entwicklertools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom zurücksetzen' },
        { role: 'zoomIn', label: 'Vergrößern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' }
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'Über MoneyMind',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'Über MoneyMind',
              message: 'MoneyMind v0.3.0',
              detail: 'Ein Tool zur Analyse von Finanztransaktionen.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Empfange Nachrichten vom Renderer-Prozess
  ipcMain.on('set-dark-mode', (_, isDark) => {
    // Nur für macOS - Standard-Menüleiste im Dark Mode
    if (process.platform === 'darwin') {
      app.commandLine.appendSwitch('force-dark-mode', isDark);
      app.commandLine.appendSwitch('enable-features', 'DarkMode');
    }
  });
}

// App ist bereit
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Beenden, wenn alle Fenster geschlossen sind, außer auf macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});