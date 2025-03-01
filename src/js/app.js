// Warte bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM vollständig geladen');
    
    // Initialisiere UI-Komponenten
    initializeUI();
    
    // Event-Listener für den Daten-Verarbeiten-Button
    const processButton = document.getElementById('processButton');
    if (processButton) {
        console.log("Process-Button gefunden, füge Event-Listener hinzu");
        processButton.addEventListener('click', handleProcessButtonClick);
    } else {
        console.warn("Process-Button nicht gefunden!");
    }
    
    // Event-Listener für das File-Input-Element
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileInputChange);
    }
    
    // Initialisiere die Dateiliste, falls vorhanden
    initializeFileList();
});

/**
 * Initialisiert die UI-Komponenten
 */
function initializeUI() {
    console.log("Initialisiere UI");
    
    // Dark Mode aus localStorage abrufen
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', darkMode);
    
    // Daten aus der Datenbank laden, falls vorhanden
    updateFileList();
}

/**
 * Verarbeitet den Klick auf den Daten-Verarbeiten-Button
 */
async function handleProcessButtonClick() {
    console.log('Verarbeiten-Button geklickt');
    
    const fileInput = document.getElementById('csvFileInput');
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        console.warn("Keine Datei ausgewählt!");
        alert("Bitte wähle zuerst eine CSV-Datei aus.");
        return;
    }
    
    const file = fileInput.files[0];
    await processCSVFile(file);
}

/**
 * Reagiert auf Änderungen im File-Input-Element
 */
function handleFileInputChange(event) {
    console.log('Dateiauswahl geändert');
    const fileName = event.target.files.length > 0 ? event.target.files[0].name : "Keine Datei ausgewählt";
    console.log(`Ausgewählte Datei: ${fileName}`);
    
    // Optional: Button aktivieren wenn Datei ausgewählt
    const processButton = document.getElementById('processButton');
    if (processButton) {
        processButton.disabled = event.target.files.length === 0;
    }
}

/**
 * Verarbeitet eine CSV-Datei
 * @param {File} file - Die zu verarbeitende CSV-Datei
 */
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
            
            await db.saveTransactions(transactions, file.name);
            console.log("Transaktionen erfolgreich gespeichert");
            
            // Aktualisiere Dateilistenanzeige
            updateFileList();
            
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            if (resultsSection) 
                resultsSection.innerHTML = `<div class="error">Fehler beim Speichern: ${error.message}</div>`;
            if (processButton) processButton.disabled = false;
            return;
        }
        
        // Berechne Statistiken
        try {
            console.log("Berechne Statistiken...");
            const stats = calculateStatistics(transactions);
            
            // UI aktualisieren
            displayResults(stats);
            
        } catch (error) {
            console.error("Fehler beim Berechnen der Statistiken:", error);
            if (resultsSection)
                resultsSection.innerHTML = `<div class="error">Fehler beim Berechnen der Statistiken: ${error.message}</div>`;
        }
        
        if (processButton) processButton.disabled = false;
        
    } catch (error) {
        console.error("Allgemeiner Fehler in processCSVFile:", error);
        alert("Fehler beim Verarbeiten der Datei: " + error.message);
        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = false;
    }
}

/**
 * Zeigt die Berechneten Statistiken an
 * @param {Object} stats - Die berechneten Statistiken 
 */
function displayResults(stats) {
    console.log("Zeige Ergebnisse an:", stats);
    
    const resultsSection = document.getElementById('results-section');
    
    if (!resultsSection) {
        console.error("Ergebnisbereich nicht gefunden!");
        return;
    }
    
    // Statistiken anzeigen
    const statsDiv = document.getElementById('statistics');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <h3>Zusammenfassung</h3>
            <ul>
                <li>Anzahl Transaktionen: ${stats.count}</li>
                <li>Gesamteinnahmen: ${stats.totalIncome.toFixed(2)} €</li>
                <li>Gesamtausgaben: ${stats.totalExpenses.toFixed(2)} €</li>
                <li>Bilanz: ${stats.balance.toFixed(2)} €</li>
                <li>Zeitraum: ${stats.startDate.toLocaleDateString()} bis ${stats.endDate.toLocaleDateString()}</li>
            </ul>
        `;
    }
    
    // Diagramm anzeigen, falls Chart.js verfügbar ist
    if (typeof Chart !== 'undefined') {
        try {
            const canvas = document.getElementById('chartCanvas');
            if (canvas) {
                // Altes Diagramm zerstören, falls vorhanden
                if (window.transactionChart) {
                    window.transactionChart.destroy();
                }
                
                // Neues Diagramm erstellen
                const ctx = canvas.getContext('2d');
                window.transactionChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Einnahmen', 'Ausgaben', 'Bilanz'],
                        datasets: [{
                            label: 'Beträge in €',
                            data: [stats.totalIncome, -stats.totalExpenses, stats.balance],
                            backgroundColor: [
                                'rgba(75, 192, 192, 0.5)',
                                'rgba(255, 99, 132, 0.5)',
                                stats.balance >= 0 ? 'rgba(54, 162, 235, 0.5)' : 'rgba(255, 159, 64, 0.5)'
                            ],
                            borderColor: [
                                'rgba(75, 192, 192, 1)',
                                'rgba(255, 99, 132, 1)',
                                stats.balance >= 0 ? 'rgba(54, 162, 235, 1)' : 'rgba(255, 159, 64, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Fehler beim Erstellen des Diagramms:", e);
        }
    } else {
        console.warn("Chart.js nicht verfügbar, überspringe Diagramm-Erstellung");
    }
}

/**
 * Aktualisiert die Dateiliste in der UI
 */
async function updateFileList() {
    console.log("Aktualisiere Dateiliste");
    const fileListDiv = document.getElementById('fileList');
    
    if (!fileListDiv) {
        console.warn("Dateiliste nicht gefunden");
        return;
    }
    
    try {
        // Dateien aus der Datenbank laden
        const files = await db.getImportedFiles();
        console.log("Dateien geladen:", files.length);
        
        if (files.length === 0) {
            fileListDiv.innerHTML = '<p>Keine importierten Dateien vorhanden.</p>';
            return;
        }
        
        // Liste erstellen
        let html = '<h3>Importierte Dateien</h3><ul class="file-list">';
        
        files.forEach(file => {
            const importDate = new Date(file.importDate).toLocaleDateString();
            html += `
                <li data-id="${file.id}">
                    <strong>${file.name}</strong>
                    <span class="file-info">(${file.transactionCount} Transaktionen, importiert am ${importDate})</span>
                    <button class="delete-file-btn" data-id="${file.id}">Löschen</button>
                </li>
            `;
        });
        
        html += '</ul>';
        fileListDiv.innerHTML = html;
        
        // Event-Listener für Lösch-Buttons
        const deleteButtons = fileListDiv.querySelectorAll('.delete-file-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', handleDeleteFile);
        });
        
    } catch (error) {
        console.error("Fehler beim Laden der Dateien:", error);
        fileListDiv.innerHTML = `<p class="error">Fehler beim Laden der Dateien: ${error.message}</p>`;
    }
}

/**
 * Behandelt das Löschen einer Datei
 */
async function handleDeleteFile(event) {
    const fileId = parseInt(event.target.dataset.id);
    console.log("Lösche Datei mit ID:", fileId);
    
    if (confirm('Möchtest du diese Datei wirklich löschen?')) {
        try {
            await db.deleteFile(fileId);
            console.log("Datei gelöscht");
            updateFileList();
        } catch (error) {
            console.error("Fehler beim Löschen der Datei:", error);
            alert(`Fehler beim Löschen: ${error.message}`);
        }
    }
}

/**
 * Berechnet Statistiken aus den Transaktionen
 */
function calculateStatistics(transactions) {
    console.log("Berechne Statistiken für", transactions.length, "Transaktionen");
    
    // Stelle sicher, dass Transaktionen ein Array ist
    if (!Array.isArray(transactions)) {
        console.error("calculateStatistics: transactions ist kein Array");
        return {
            count: 0,
            totalIncome: 0,
            totalExpenses: 0,
            balance: 0,
            startDate: new Date(),
            endDate: new Date()
        };
    }
    
    let totalIncome = 0;
    let totalExpenses = 0;
    let dates = [];
    
    // Berechne die Werte
    transactions.forEach(transaction => {
        const amount = parseFloat(transaction.Betrag);
        
        if (isNaN(amount)) {
            console.warn("Ungültiger Betrag gefunden:", transaction.Betrag);
            return;
        }
        
        if (amount > 0) {
            totalIncome += amount;
        } else {
            totalExpenses += Math.abs(amount);
        }
        
        if (transaction.Buchungsdatum instanceof Date) {
            dates.push(transaction.Buchungsdatum);
        }
    });
    
    // Sortiere die Daten und finde Start- und End-Datum
    dates.sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates.length > 0 ? dates[0] : new Date();
    const endDate = dates.length > 0 ? dates[dates.length - 1] : new Date();
    
    return {
        count: transactions.length,
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        startDate,
        endDate
    };
}

// Für die Kompatibilität mit Electron, mach die Funktion global verfügbar
window.processCSVFile = processCSVFile;
window.calculateStatistics = calculateStatistics;
window.displayResults = displayResults;
window.updateFileList = updateFileList;