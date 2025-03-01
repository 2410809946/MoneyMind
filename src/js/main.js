/**
 * Finanzanalysator - Hauptfunktionen
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM-Elemente
    const csvFileInput = document.getElementById('csvFileInput');
    const processButton = document.getElementById('processButton');
    const fileList = document.getElementById('fileList');
    const statistics = document.getElementById('statistics');
    
    // Event-Listener
    processButton.addEventListener('click', processCSVFile);
    
    // Dark Mode anwenden
    applyDarkModeFromSettings();
    
    // Initialisiere DB und lade Dateiliste
    initApp();
    
    // Initialisiert die Anwendung
    async function initApp() {
        try {
            await db.init();
            await updateFileList();
        } catch (error) {
            console.error('Fehler beim Initialisieren der App:', error);
            showNotification('Fehler beim Laden der Datenbank', 'error');
        }
    }
    
    // Verarbeitet die ausgewählte CSV-Datei
    // Füge diese Funktion hinzu oder ersetze die vorhandene processCSVFile-Funktion

async function processCSVFile(file) {
    try {
        console.log("Verarbeite CSV-Datei:", file.name);
        
        // UI-Updates
        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = true;
        
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.innerHTML = '<div class="loading">Verarbeite Daten...</div>';
        
        // CSV-Datei parsen
        console.log("Starte CSV-Parsing...");
        let transactions;
        
        try {
            transactions = await parseCSV(file);
            console.log("CSV-Parsing abgeschlossen, Ergebnis:", typeof transactions);
            console.log("Ist Array:", Array.isArray(transactions));
            console.log("Anzahl Transaktionen:", transactions && Array.isArray(transactions) ? transactions.length : 0);
            
            // WICHTIG: Stelle absolut sicher, dass wir mit einem Array arbeiten
            if (!Array.isArray(transactions)) {
                console.error("KRITISCH: Transaktionen sind kein Array nach dem Parsing!");
                if (transactions && typeof transactions === 'object') {
                    // Versuche, das Objekt in ein Array zu konvertieren
                    transactions = Object.values(transactions);
                    console.log("Nach Konvertierung: Ist Array?", Array.isArray(transactions));
                }
                
                if (!Array.isArray(transactions)) {
                    // Als absoluten Fallback ein leeres Array erstellen
                    console.warn("Erstelle ein leeres Array als Fallback");
                    transactions = [];
                }
            }
            
            if (transactions.length === 0) {
                throw new Error("Keine Transaktionen gefunden. Bitte überprüfe das CSV-Format.");
            }
            
        } catch (error) {
            console.error("Fehler beim CSV-Parsing:", error);
            if (resultsSection) 
                resultsSection.innerHTML = `<div class="error">Fehler beim Parsen der Datei: ${error.message}</div>`;
            if (processButton) processButton.disabled = false;
            return;
        }
        
        // In IndexedDB speichern
        try {
            console.log("Speichere Transaktionen in Datenbank...");
            console.log("Vor dem Speichern - Transaktionstyp:", typeof transactions);
            console.log("Vor dem Speichern - Ist Array:", Array.isArray(transactions));
            
            // WICHTIG: Explizit prüfen, bevor die DB-Funktion aufgerufen wird
            if (!Array.isArray(transactions)) {
                throw new Error("transactions ist kein Array vor dem Speichern");
            }
            
            // Versuche saveTransactions (nicht saveImportedFile)
            await db.saveTransactions(transactions, file.name);
            console.log("Transaktionen erfolgreich gespeichert");
            
            // Aktualisiere Dateilistenanzeige wenn vorhanden
            if (typeof updateFileList === 'function') {
                updateFileList();
            }
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            if (resultsSection) 
                resultsSection.innerHTML = `<div class="error">Fehler beim Speichern: ${error.message}</div>`;
            if (processButton) processButton.disabled = false;
            return;
        }
        
        // Berechne Statistiken
        console.log("Berechne Statistiken...");
        const stats = calculateStatistics(transactions);
        
        // UI aktualisieren
        if (typeof displayResults === 'function') {
            displayResults(stats);
        }
        
        if (processButton) processButton.disabled = false;
        
    } catch (error) {
        console.error("Allgemeiner Fehler in processCSVFile:", error);
        alert("Fehler beim Verarbeiten der Datei: " + error.message);
        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = false;
    }
}

// Für die Kompatibilität mit Electron, mach die Funktion global verfügbar
window.processCSVFile = processCSVFile;
    
    // Speichert die Datei und Transaktionen in der Datenbank
    async function saveFileAndTransactions(fileName, transactions) {
        // Datei-Eintrag speichern
        const fileData = {
            name: fileName,
            importDate: new Date().toISOString(),
            transactionCount: transactions.length
        };
        
        const fileId = await db.saveImportedFile(fileData);
        
        // Transaktionen speichern
        for (const transaction of transactions) {
            transaction.fileId = fileId;
        }
        

        // In der processCSVFile Funktion, vor dem Aufruf von saveTransactions/saveImportedFile:
        console.log("Transaktionen Typ:", typeof transactions);
        console.log("Ist transactions ein Array?", Array.isArray(transactions));
        console.log("Transaktionen Beispieldaten:", transactions.length > 0 ? transactions[0] : "Keine Daten");

        await db.saveTransactions(transactions);
        
        return fileId;
    }
    
    // Aktualisiert die Liste der importierten Dateien
    async function updateFileList() {
        try {
            const files = await db.getImportedFiles();
            
            if (!files || !files.length) {
                fileList.innerHTML = '<p>Keine importierten Dateien vorhanden.</p>';
                return;
            }
            
            let html = '<h3>Importierte Dateien</h3><ul class="file-list">';
            
            for (const file of files) {
                const date = new Date(file.importDate).toLocaleDateString();
                html += `
                    <li class="file-item">
                        <div class="file-info">
                            <span class="file-name">${file.name}</span>
                            <span class="file-date">Importiert am: ${date}</span>
                            <span class="file-count">${file.transactionCount} Transaktionen</span>
                        </div>
                        <button class="delete-file-btn" data-id="${file.id}">Löschen</button>
                    </li>
                `;
            }
            
            html += '</ul>';
            fileList.innerHTML = html;
            
            // Event-Listener für Lösch-Buttons hinzufügen
            document.querySelectorAll('.delete-file-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const fileId = this.getAttribute('data-id');
                    if (confirm('Möchtest du diese Datei wirklich löschen?')) {
                        try {
                            await db.deleteImportedFile(fileId);
                            await updateFileList();
                            showNotification('Datei erfolgreich gelöscht', 'success');
                        } catch (error) {
                            console.error('Fehler beim Löschen der Datei:', error);
                            showNotification('Fehler beim Löschen der Datei', 'error');
                        }
                    }
                });
            });
            
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Dateiliste:', error);
            fileList.innerHTML = '<p>Fehler beim Laden der Dateiliste.</p>';
        }
    }
    
    // Zeigt eine Benachrichtigung an
    function showNotification(message, type = 'info') {
        // Bestehende Benachrichtigung entfernen
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Neue Benachrichtigung erstellen
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Nach 3 Sekunden ausblenden
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    // Zeigt Statistiken an
    function displayStatistics(stats) {
        statistics.innerHTML = `
            <div class="stat-grid">
                <div class="stat-box">
                    <h3>Zeitraum</h3>
                    <div class="stat-value">${stats.startDate} - ${stats.endDate}</div>
                </div>
                <div class="stat-box">
                    <h3>Anzahl Transaktionen</h3>
                    <div class="stat-value">${stats.count}</div>
                </div>
                <div class="stat-box">
                    <h3>Einnahmen</h3>
                    <div class="stat-value income">${stats.income.toFixed(2)} €</div>
                </div>
                <div class="stat-box">
                    <h3>Ausgaben</h3>
                    <div class="stat-value expense">${stats.expenses.toFixed(2)} €</div>
                </div>
                <div class="stat-box">
                    <h3>Saldo</h3>
                    <div class="stat-value ${stats.balance >= 0 ? 'income' : 'expense'}">${stats.balance.toFixed(2)} €</div>
                </div>
            </div>
        `;
    }
    
    // Wendet den Dark Mode basierend auf gespeicherten Einstellungen an
    function applyDarkModeFromSettings() {
        const savedSettings = localStorage.getItem('financeAppSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.darkMode) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            } catch (e) {
                console.error('Fehler beim Parsen der Dark-Mode-Einstellungen:', e);
            }
        }
    }
});