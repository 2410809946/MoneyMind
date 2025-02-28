/**
 * CSV-Parser für den Finanzanalysator
 * Verarbeitet CSV-Dateien verschiedener Banken
 */

/**
 * Parst eine CSV-Datei und gibt die strukturierten Daten zurück
 * @param {File} file - Die zu parsende CSV-Datei
 * @returns {Promise<Array>} Array mit den strukturierten Transaktionsdaten
 */
async function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                const csv = event.target.result;
                
                // Erkenne die CSV-Art (Bank) anhand des Inhalts
                const bankType = detectBankType(csv);
                console.log(`Erkannter Bank-Typ: ${bankType}`);
                
                // Entsprechend parsen
                let transactions;
                
                switch(bankType) {
                    case 'sparkasse':
                        transactions = parseSparkasseCSV(csv);
                        break;
                    case 'dkb':
                        transactions = parseDKBCSV(csv);
                        break;
                    case 'ing':
                        transactions = parseINGCSV(csv);
                        break;
                    case 'comdirect':
                        transactions = parseComdirectCSV(csv);
                        break;
                    default:
                        transactions = parseGenericCSV(csv);
                }
                
                // Normalisiere und validiere die Daten
                const normalizedData = normalizeTransactions(transactions);
                
                resolve(normalizedData);
            } catch (error) {
                console.error('Fehler beim Parsen der CSV-Datei:', error);
                reject(new Error('Die CSV-Datei konnte nicht korrekt geparst werden: ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Die Datei konnte nicht gelesen werden.'));
        };
        
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * Erkennt den Typ der Bank anhand des CSV-Inhalts
 */
function detectBankType(csv) {
    const firstLines = csv.split('\n').slice(0, 5).join('\n').toLowerCase();
    
    if (firstLines.includes('sparkasse') || firstLines.includes('buchungstag;wertstellung;')) {
        return 'sparkasse';
    } else if (firstLines.includes('dkb') || firstLines.includes('buchungstag;wertstellung;buchungstext;')) {
        return 'dkb';
    } else if (firstLines.includes('ing') || firstLines.includes('buchung;valuta;')) {
        return 'ing';
    } else if (firstLines.includes('comdirect') || firstLines.includes('buchungstag;valuta;')) {
        return 'comdirect';
    }
    
    return 'generic';
}

/**
 * Parst eine Sparkassen-CSV-Datei
 */
function parseSparkasseCSV(csv) {
    const lines = csv.split('\n');
    let dataStartIndex = 0;
    
    // Finde den Beginn der Daten
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Buchungstag;Wertstellung;') || lines[i].includes('Buchungsdatum;Valutadatum;')) {
            dataStartIndex = i;
            break;
        }
    }
    
    // Überschrift für die Spalten
    const headers = lines[dataStartIndex].split(';');
    
    // Daten parsen
    const data = [];
    for (let i = dataStartIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(';');
        if (values.length < 5) continue;
        
        const transaction = {};
        
        headers.forEach((header, index) => {
            // Map Sparkassen-Felder auf standardisierte Felder
            const value = values[index] ? values[index].replace(/"/g, '') : '';
            
            switch (header.toLowerCase().replace(/"/g, '')) {
                case 'buchungstag':
                case 'buchungsdatum':
                    transaction['Buchungsdatum'] = formatDate(value);
                    break;
                case 'betrag':
                case 'betrag (eur)':
                    transaction['Betrag'] = parseFloat(value.replace(',', '.'));
                    break;
                case 'verwendungszweck':
                    transaction['Verwendungszweck'] = value;
                    break;
                case 'empfänger/zahlungspflichtiger':
                case 'beguenstigter/zahlungspflichtiger':
                    const nameParts = value.split(',');
                    if (nameParts.length > 0) {
                        transaction['Empfängername'] = nameParts[0].trim();
                    }
                    if (nameParts.length > 1) {
                        transaction['Empfängerkennung'] = nameParts[1].trim();
                    }
                    break;
                default:
                    // Sonstige Felder direkt übernehmen
                    transaction[header.replace(/"/g, '')] = value;
            }
        });
        
        data.push(transaction);
    }
    
    return data;
}

/**
 * Parst eine DKB-CSV-Datei
 */
function parseDKBCSV(csv) {
    // Implementierung ähnlich wie bei Sparkasse
    const lines = csv.split('\n');
    const data = [];
    
    // Hier sollte die spezifische DKB-Logik implementiert werden
    // Beispielimplementierung:
    let dataStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Buchungstag;Wertstellung;Buchungstext;')) {
            dataStartIndex = i;
            break;
        }
    }
    
    const headers = lines[dataStartIndex].split(';');
    
    for (let i = dataStartIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(';');
        if (values.length < 5) continue;
        
        const transaction = {};
        
        // DKB-spezifisches Mapping
        headers.forEach((header, index) => {
            const value = values[index] ? values[index].replace(/"/g, '') : '';
            
            switch (header.toLowerCase().replace(/"/g, '')) {
                case 'buchungstag':
                    transaction['Buchungsdatum'] = formatDate(value);
                    break;
                case 'betrag (eur)':
                    transaction['Betrag'] = parseFloat(value.replace(',', '.'));
                    break;
                case 'buchungstext':
                    transaction['Text'] = value;
                    break;
                case 'auftraggeber / begünstigter':
                    transaction['Empfängername'] = value;
                    break;
                case 'verwendungszweck':
                    transaction['Verwendungszweck'] = value;
                    break;
                default:
                    transaction[header.replace(/"/g, '')] = value;
            }
        });
        
        data.push(transaction);
    }
    
    return data;
}

/**
 * Parst eine ING-CSV-Datei
 */
function parseINGCSV(csv) {
    // Implementierung für ING
    return [];
}

/**
 * Parst eine Comdirect-CSV-Datei
 */
function parseComdirectCSV(csv) {
    // Implementierung für Comdirect
    return [];
}

/**
 * Parst eine generische CSV-Datei
 */
function parseGenericCSV(csv) {
    const lines = csv.split('\n');
    
    // Finde die Überschrift
    let headerLine = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (lines[i].toLowerCase().includes('datum') && 
            (lines[i].toLowerCase().includes('betrag') || lines[i].toLowerCase().includes('umsatz'))) {
            headerLine = i;
            break;
        }
    }
    
    const headers = lines[headerLine].split(';').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = headerLine + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''));
        if (values.length < 3) continue;
        
        const transaction = {};
        
        // Versuche, die wichtigsten Felder zu identifizieren
        let dateField = null;
        let amountField = null;
        let purposeField = null;
        
        headers.forEach((header, index) => {
            const headerLower = header.toLowerCase();
            const value = values[index];
            
            if (headerLower.includes('datum') || headerLower.includes('date')) {
                dateField = header;
                transaction['Buchungsdatum'] = formatDate(value);
            } else if (headerLower.includes('betrag') || headerLower.includes('amount') || headerLower.includes('umsatz')) {
                amountField = header;
                transaction['Betrag'] = parseFloat(value.replace(',', '.'));
            } else if (headerLower.includes('verwendungszweck') || headerLower.includes('zweck') || headerLower.includes('purpose')) {
                purposeField = header;
                transaction['Verwendungszweck'] = value;
            } else if (headerLower.includes('empfänger') || headerLower.includes('recipient') || headerLower.includes('zahler')) {
                transaction['Empfängername'] = value;
            } else {
                transaction[header] = value;
            }
        });
        
        // Wenn wichtige Felder fehlen, versuche sie zu erraten
        if (!transaction['Buchungsdatum'] && values[0].match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/)) {
            transaction['Buchungsdatum'] = formatDate(values[0]);
        }
        
        if (transaction['Betrag'] === undefined) {
            // Suche nach einem Wert, der wie ein Geldbetrag aussieht
            for (let j = 0; j < values.length; j++) {
                if (values[j].match(/[-+]?\d+[,.]?\d*/)) {
                    transaction['Betrag'] = parseFloat(values[j].replace(',', '.'));
                    break;
                }
            }
        }
        
        data.push(transaction);
    }
    
    return data;
}

/**
 * Normalisiert und validiert die Transaktionen
 */
function normalizeTransactions(transactions) {
    return transactions.filter(transaction => {
        // Grundlegende Validierung
        if (transaction.Buchungsdatum === undefined || transaction.Betrag === undefined) {
            console.warn('Ungültige Transaktion gefunden:', transaction);
            return false;
        }
        
        // Stelle sicher, dass alle wichtigen Felder vorhanden sind
        if (!transaction.Verwendungszweck) {
            transaction.Verwendungszweck = '';
        }
        
        // Stelle sicher, dass das Datum ein gültiges Objekt ist
        if (typeof transaction.Buchungsdatum === 'string') {
            transaction.Buchungsdatum = formatDate(transaction.Buchungsdatum);
        }
        
        return true;
    });
}

/**
 * Formatiert ein Datum in ein standardisiertes Format
 */
function formatDate(dateStr) {
    if (!dateStr) return null;
    
    // Entferne doppelte Anführungszeichen
    dateStr = dateStr.replace(/"/g, '');
    
    // Erkenne gängige Datumsformate
    let parts;
    
    // Format: DD.MM.YYYY oder DD.MM.YY
    if (dateStr.includes('.')) {
        parts = dateStr.split('.');
        if (parts[2] && parts[2].length === 2) {
            parts[2] = '20' + parts[2]; // Ergänze Jahrhundert
        }
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    // Format: YYYY-MM-DD
    if (dateStr.includes('-')) {
        parts = dateStr.split('-');
        if (parts[0].length === 4) {
            return dateStr; // Bereits im richtigen Format
        }
        // Format: DD-MM-YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    // Format: DD/MM/YYYY
    if (dateStr.includes('/')) {
        parts = dateStr.split('/');
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    // Wenn nichts funktioniert, gib das Original zurück
    console.warn(`Unbekanntes Datumsformat: ${dateStr}`);
    return dateStr;
}