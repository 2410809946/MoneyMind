// In einer neuen Datei: src/js/csv-processor.js
window.processTransactions = async function(transactions, fileName) {
    try {
        console.log("processTransactions aufgerufen mit", transactions.length, "Transaktionen");
        
        // UI-Updates
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.innerHTML = '<div class="loading">Verarbeite Daten...</div>';
        
        // In IndexedDB speichern
        if (typeof window.db !== 'undefined' && typeof window.db.saveTransactions === 'function') {
            await window.db.saveTransactions(transactions, fileName);
            console.log("Transaktionen erfolgreich gespeichert");
            
            // Aktualisiere Dateilistenanzeige wenn vorhanden
            if (typeof updateFileList === 'function') {
                updateFileList();
            }
            
            // Berechne Statistiken
            if (typeof calculateStatistics === 'function') {
                const stats = calculateStatistics(transactions);
                
                // UI aktualisieren
                if (typeof displayResults === 'function') {
                    displayResults(stats);
                }
            }
        } else {
            console.error("DB-Objekt oder saveTransactions-Methode nicht gefunden");
            if (resultsSection) {
                resultsSection.innerHTML = '<div class="error">Fehler: Datenbank nicht verfügbar</div>';
            }
        }
        
        return true;
    } catch (error) {
        console.error("Fehler beim Verarbeiten der Transaktionen:", error);
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.innerHTML = `<div class="error">Fehler: ${error.message}</div>`;
        }
        throw error;
    }
};