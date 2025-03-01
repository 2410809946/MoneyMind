document.addEventListener('DOMContentLoaded', () => {
    if (window.electronAPI) {
        console.log("Electron erkannt, initialisiere Electron-spezifische Features");
        
        window.electronAPI.onFileOpened(async (filePath) => {
            console.log("Datei geöffnet:", filePath);
            try {
                // Datei über Electron API lesen
                const content = await window.electronAPI.readFile(filePath);
                console.log("Dateiinhalt gelesen, Länge:", content ? content.length : 0);
                
                if (!content) {
                    throw new Error("Leerer Dateiinhalt");
                }
                
                // CSV-Inhalt als Blob erstellen
                const blob = new Blob([content], { type: 'text/csv' });
                console.log("Blob erstellt:", blob.size, "bytes");
                
                // Blob in File-Objekt umwandeln
                const fileName = filePath.split(/[\\/]/).pop();
                const file = new File([blob], fileName, { type: 'text/csv' });
                console.log("File-Objekt erstellt:", file.name, file.size, "bytes");
                
                // SEHR WICHTIG - Direkter Aufruf der CSV-Verarbeitung ohne FileReader
                // Erstelle ein neues Textobjekt aus dem Inhalt
                const csvText = content.toString();
                console.log("CSV-Text erstellt, Länge:", csvText.length);
                
                // Rufe eine Funktion auf, die ohne FileReader arbeitet
                if (typeof window.parseCSVContent === 'function') {
                    console.log("Rufe parseCSVContent direkt mit Text auf");
                    const transactions = await window.parseCSVContent(csvText, fileName);
                    console.log("CSV verarbeitet, Transaktionen:", transactions ? transactions.length : 0);
                    
                    if (Array.isArray(transactions) && transactions.length > 0) {
                        if (typeof window.processTransactions === 'function') {
                            await window.processTransactions(transactions, fileName);
                        } else {
                            console.error("processTransactions-Funktion nicht gefunden");
                        }
                    } else {
                        console.error("Keine gültigen Transaktionen gefunden");
                        throw new Error("Keine gültigen Transaktionen in der CSV-Datei gefunden");
                    }
                    return; // Beende hier bei erfolgreicher Verarbeitung
                }
                
                // Fallback 1: Versuche die parseCsvDirectly-Funktion
                if (typeof window.parseCsvDirectly === 'function') {
                    console.log("Fallback 1: Versuche parseCsvDirectly");
                    const transactions = await window.parseCsvDirectly(content, fileName);
                    if (Array.isArray(transactions) && transactions.length > 0) {
                        if (typeof window.db !== 'undefined' && typeof window.db.saveTransactions === 'function') {
                            await window.db.saveTransactions(transactions, fileName);
                            console.log("Transaktionen gespeichert");
                            return;
                        }
                    }
                }
                
                // Fallback 2: Versuche mit dem FileInput
                console.log("Fallback 2: Versuche mit FileInput");
                const fileInput = document.getElementById('csvFileInput');
                if (fileInput) {
                    try {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        
                        const processButton = document.getElementById('processButton');
                        if (processButton) {
                            processButton.click();
                        } else {
                            console.warn("Verarbeiten-Button nicht gefunden");
                        }
                    } catch (err) {
                        console.error("Fehler bei Fallback 2:", err);
                    }
                } else {
                    console.warn("File-Input nicht gefunden");
                }
                
            } catch (error) {
                console.error("Fehler beim Verarbeiten der Datei:", error);
                alert("Die Datei konnte nicht verarbeitet werden: " + error.message);
            }
        });
    } else {
        console.log("Keine Electron API gefunden");
    }
});



// Füge am Ende der Datei hinzu:

/**
 * Parst eine CSV-Datei direkt aus dem Inhalt (ohne FileReader)
 * @param {string} csvContent - Der Inhalt der CSV-Datei als String
 * @param {string} fileName - Der Name der Datei
 * @returns {Promise<Array>} Array mit den strukturierten Transaktionsdaten
 */
async function parseCSVContent(csvContent, fileName) {
    try {
        console.log("parseCSVContent aufgerufen mit Inhalt der Länge:", csvContent.length);
        
        // Direktes Parsen des CSV-Inhalts
        const bankType = detectBankType(csvContent);
        console.log(`Erkannter Bank-Typ: ${bankType}`);
        
        // Entsprechend parsen
        let transactions = [];
        
        try {
            switch(bankType) {
                case 'sparkasse':
                    transactions = parseSparkasseCSV(csvContent);
                    break;
                case 'dkb':
                    transactions = parseDKBCSV(csvContent);
                    break;
                case 'ing':
                    transactions = parseINGCSV(csvContent);
                    break;
                case 'comdirect':
                    transactions = parseComdirectCSV(csvContent);
                    break;
                default:
                    transactions = parseGenericCSV(csvContent);
            }
        } catch (parseError) {
            console.error("Fehler beim Parsen des spezifischen Bank-Formats:", parseError);
            // Fallback auf generisches Format
            try {
                transactions = parseGenericCSV(csvContent);
                console.log("Fallback auf generisches Format");
            } catch (fallbackError) {
                console.error("Fehler beim generischen Fallback:", fallbackError);
                throw new Error("Datei konnte nicht geparst werden: " + fallbackError.message);
            }
        }
        
        console.log("Parsing-Ergebnis:", typeof transactions);
        console.log("Ist Array?", Array.isArray(transactions));
        console.log("Länge:", transactions ? (Array.isArray(transactions) ? transactions.length : 0) : 0);
        
        // Stelle sicher, dass transactions ein Array ist
        if (!Array.isArray(transactions)) {
            console.error("Parsing-Ergebnis ist kein Array:", transactions);
            if (transactions && typeof transactions === 'object') {
                // Versuche, das Objekt in ein Array zu konvertieren
                transactions = Object.values(transactions);
                console.log("Nach Konvertierung: Ist Array?", Array.isArray(transactions));
            } else {
                // Fallback: Leeres Array
                transactions = [];
            }
        }
        
        // Normalisiere und validiere die Daten
        const normalizedData = normalizeTransactions(transactions);
        console.log("Normalisierte Daten:", normalizedData.length);
        
        return normalizedData;
    } catch (error) {
        console.error("Fehler in parseCSVContent:", error);
        throw error;
    }
}

/**
 * Alternative direkte CSV-Parsing-Funktion
 * @param {string} csvContent - Der Inhalt der CSV-Datei als String
 * @param {string} fileName - Der Name der Datei
 */
async function parseCsvDirectly(csvContent, fileName) {
    console.log("parseCsvDirectly aufgerufen");
    
    try {
        const lines = csvContent.split('\n');
        const transactions = [];
        
        // Einfache CSV-Struktur annehmen: Datum,Beschreibung,Betrag
        // Überspringe erste Zeile (Header)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Prüfe ob Komma oder Semikolon als Trennzeichen
            const delimiter = line.includes(';') ? ';' : ',';
            const fields = line.split(delimiter);
            
            if (fields.length < 3) continue;
            
            const transaction = {
                Buchungsdatum: new Date(),
                Betrag: 0,
                Verwendungszweck: "Unbekannt"
            };
            
            // Versuche zu erkennen, welches Feld was ist
            for (let j = 0; j < fields.length; j++) {
                const field = fields[j].trim();
                
                // Ist es ein Datum?
                if (field.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/)) {
                    transaction.Buchungsdatum = formatDate(field);
                } 
                // Ist es ein Betrag?
                else if (field.match(/^[+-]?[0-9]*[.,]?[0-9]+$/)) {
                    transaction.Betrag = parseFloat(field.replace(',', '.'));
                }
                // Sonst ist es wahrscheinlich der Verwendungszweck
                else if (field.length > 3) {
                    transaction.Verwendungszweck = field;
                }
            }
            
            transactions.push(transaction);
        }
        
        return transactions;
    } catch (error) {
        console.error("Fehler in parseCsvDirectly:", error);
        throw error;
    }
}



/**
 * Verarbeitet ein Array von Transaktionen und speichert sie in der Datenbank
 * @param {Array} transactions - Die zu verarbeitenden Transaktionen
 * @param {string} fileName - Der Name der Datei
 * @returns {Promise<boolean>} - Erfolgreich oder nicht
 */
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
                } else {
                    console.log("displayResults-Funktion nicht gefunden");
                    // Fallback: Einfache Ergebnisanzeige
                    if (resultsSection) {
                        resultsSection.innerHTML = `<div class="success">
                            <h3>Import erfolgreich</h3>
                            <p>${transactions.length} Transaktionen importiert</p>
                        </div>`;
                    }
                }
            } else {
                console.log("calculateStatistics-Funktion nicht gefunden");
                // Einfache Erfolgsmeldung
                if (resultsSection) {
                    resultsSection.innerHTML = `<div class="success">
                        <h3>Import erfolgreich</h3>
                        <p>${transactions.length} Transaktionen importiert</p>
                    </div>`;
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
            resultsSection.innerHTML = `<div class="error">Fehler beim Verarbeiten: ${error.message}</div>`;
        }
        throw error;
    }
};

// Exportiere die Funktionen in das globale Scope
window.parseCSV = parseCSV;
window.parseCSVContent = parseCSVContent;
window.parseCsvDirectly = parseCsvDirectly;