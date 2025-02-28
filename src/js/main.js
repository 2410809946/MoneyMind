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
    async function processCSVFile() {
        if (!csvFileInput.files.length) {
            showNotification('Bitte wähle eine CSV-Datei aus', 'warning');
            return;
        }
        
        const file = csvFileInput.files[0];
        
        try {
            // Zeige Ladeindikator
            showNotification('Datei wird verarbeitet...', 'info');
            
            // Datei parsen
            const parsedData = await parseCSV(file);
            
            if (!parsedData || !parsedData.length) {
                showNotification('Die Datei enthält keine gültigen Daten', 'error');
                return;
            }
            
            // Statistiken berechnen
            const stats = calculateStatistics(parsedData);
            
            // In der Datenbank speichern
            const fileId = await saveFileAndTransactions(file.name, parsedData);
            
            // UI aktualisieren
            displayStatistics(stats);
            createChart(stats);
            await updateFileList();
            
            // Erfolgsbenachrichtigung
            showNotification(`${parsedData.length} Transaktionen erfolgreich importiert`, 'success');
            
            // Eingabefeld zurücksetzen
            csvFileInput.value = '';
            
        } catch (error) {
            console.error('Fehler beim Verarbeiten der Datei:', error);
            showNotification('Fehler beim Verarbeiten der Datei: ' + error.message, 'error');
        }
    }
    
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