/**
 * CSV-Parser für den Finanzanalysator
 * Verarbeitet CSV-Dateien verschiedener Banken
 */

/**
 * Erkennt den Typ der Bank anhand des CSV-Inhalts
 * @param {string} csv - Der Inhalt der CSV-Datei
 * @returns {string} Der erkannte Bank-Typ (sparkasse, dkb, ing, comdirect oder generic)
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
                console.log("CSV geladen, Größe:", csv.length);
                
                if (!csv || csv.length === 0) {
                    return reject(new Error("Die CSV-Datei ist leer"));
                }
                
                // Erkenne die CSV-Art (Bank) anhand des Inhalts
                const bankType = detectBankType(csv);
                console.log(`Erkannter Bank-Typ: ${bankType}`);
                
                // Entsprechend parsen
                let transactions = [];
                
                try {
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
                } catch (parseError) {
                    console.error("Fehler beim Parsen des spezifischen Bank-Formats:", parseError);
                    // Fallback auf generisches Format
                    try {
                        transactions = parseGenericCSV(csv);
                        console.log("Fallback auf generisches Format");
                    } catch (fallbackError) {
                        console.error("Fehler beim generischen Fallback:", fallbackError);
                        return reject(new Error("Datei konnte nicht geparst werden: " + fallbackError.message));
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
                
                // Stelle sicher, dass wir mindestens einige Transaktionen haben
                if (transactions.length === 0) {
                    console.warn("Keine Transaktionen gefunden, versuche generisches Parsing als Fallback");
                    // Versuche generisches Parsing als Fallback
                    try {
                        const genericTransactions = parseGenericCSV(csv);
                        if (genericTransactions && genericTransactions.length > 0) {
                            transactions = genericTransactions;
                            console.log("Generischer Fallback erfolgreich");
                        } else {
                            console.warn("Generischer Fallback hat keine Transaktionen gefunden");
                        }
                    } catch (error) {
                        console.warn("Generischer Fallback gescheitert:", error);
                    }
                }
                
                // Normalisiere und validiere die Daten
                const normalizedData = normalizeTransactions(transactions);
                console.log("Normalisierte Daten:", normalizedData.length);
                
                if (normalizedData.length === 0) {
                    // Letzte Überprüfung, ob wir Daten haben
                    return reject(new Error("Keine gültigen Transaktionen in der CSV-Datei gefunden"));
                }
                
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
    const lines = csv.split('\n');
    const data = [];
    
    // ING-spezifische Implementierung
    let dataStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Buchung;Valuta;') || lines[i].includes('Buchungsdatum;Wertstellung;')) {
            dataStartIndex = i;
            break;
        }
    }
    
    const headers = lines[dataStartIndex].split(';');
    
    for (let i = dataStartIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(';');
        if (values.length < 4) continue;
        
        const transaction = {};
        
        headers.forEach((header, index) => {
            const value = values[index] ? values[index].replace(/"/g, '') : '';
            
            switch (header.toLowerCase().replace(/"/g, '')) {
                case 'buchung':
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
                case 'auftraggeber/empfänger':
                case 'name':
                    transaction['Empfängername'] = value;
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
 * Parst eine Comdirect-CSV-Datei
 */
function parseComdirectCSV(csv) {
    const lines = csv.split('\n');
    const data = [];
    
    // Comdirect-spezifische Implementierung
    let dataStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Buchungstag;Valuta;') || lines[i].includes('Buchungsdatum;Wertstellung;')) {
            dataStartIndex = i;
            break;
        }
    }
    
    const headers = lines[dataStartIndex].split(';');
    
    for (let i = dataStartIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(';');
        if (values.length < 4) continue;
        
        const transaction = {};
        
        headers.forEach((header, index) => {
            const value = values[index] ? values[index].replace(/"/g, '') : '';
            
            switch (header.toLowerCase().replace(/"/g, '')) {
                case 'buchungstag':
                case 'buchungsdatum':
                    transaction['Buchungsdatum'] = formatDate(value);
                    break;
                case 'umsatz':
                case 'betrag (eur)':
                    transaction['Betrag'] = parseFloat(value.replace(',', '.'));
                    break;
                case 'buchungstext':
                case 'vorgang':
                    transaction['Text'] = value;
                    break;
                case 'name':
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
 * Parst eine generische CSV-Datei
 */
function parseGenericCSV(csv) {
    const lines = csv.split('\n');
    
    // Finde die Überschrift
    let headerLine = 0;
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        const lineLower = lines[i].toLowerCase();
        if ((lineLower.includes('datum') || lineLower.includes('date')) && 
            (lineLower.includes('betrag') || lineLower.includes('amount') || 
             lineLower.includes('umsatz') || lineLower.includes('wert'))) {
            headerLine = i;
            break;
        }
    }
    
    // Identifiziere das Trennzeichen (Semikolon, Komma, Tab)
    const firstLine = lines[headerLine];
    const possibleDelimiters = [';', ',', '\t'];
    let delimiter = ';'; // Default
    
    for (const del of possibleDelimiters) {
        if (firstLine.includes(del)) {
            const count = firstLine.split(del).length;
            if (count > 2) { // Mindestens 3 Spalten
                delimiter = del;
                break;
            }
        }
    }
    
    console.log("Erkanntes Trennzeichen:", delimiter === '\t' ? "Tab" : delimiter);
    
    const headers = lines[headerLine].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = headerLine + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
        if (values.length < 3) continue;
        
        const transaction = {};
        
        // Versuche, die wichtigsten Felder zu identifizieren
        let dateField = null;
        let amountField = null;
        let purposeField = null;
        
        headers.forEach((header, index) => {
            const headerLower = header.toLowerCase();
            const value = index < values.length ? values[index] : '';
            
            if (headerLower.includes('datum') || headerLower.includes('date')) {
                dateField = header;
                transaction['Buchungsdatum'] = formatDate(value);
            } else if (headerLower.includes('betrag') || headerLower.includes('amount') || headerLower.includes('umsatz')) {
                amountField = header;
                try {
                    transaction['Betrag'] = parseFloat(value.replace(/\./g, '').replace(',', '.'));
                } catch (e) {
                    console.warn("Konnte Betrag nicht parsen:", value);
                }
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
        if (!transaction['Buchungsdatum'] && values[0] && values[0].match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/)) {
            transaction['Buchungsdatum'] = formatDate(values[0]);
        }
        
        if (transaction['Betrag'] === undefined) {
            // Suche nach einem Wert, der wie ein Geldbetrag aussieht
            for (let j = 0; j < values.length; j++) {
                if (values[j] && values[j].match(/[-+]?\d+[,.]?\d*/)) {
                    try {
                        transaction['Betrag'] = parseFloat(values[j].replace(/\./g, '').replace(',', '.'));
                        break;
                    } catch (e) {
                        // Ignorieren und weitersuchen
                    }
                }
            }
        }
        
        // Wenn immer noch kein Buchungsdatum gefunden wurde, verwende das aktuelle Datum
        if (!transaction['Buchungsdatum']) {
            transaction['Buchungsdatum'] = new Date();
        }
        
        // Wenn immer noch kein Betrag gefunden wurde, setze auf 0
        if (transaction['Betrag'] === undefined) {
            transaction['Betrag'] = 0;
        }
        
        // Stelle sicher, dass ein Verwendungszweck vorhanden ist
        if (!transaction['Verwendungszweck']) {
            transaction['Verwendungszweck'] = values.join(' ').substring(0, 100);
        }
        
        data.push(transaction);
    }
    
    return data;
}

/**
 * Normalisiert und validiert die Transaktionen
 */
function normalizeTransactions(transactions) {
    console.log("Normalisiere Transaktionen...");
    
    if (!transactions) {
        console.error("Keine Transaktionen zum Normalisieren vorhanden");
        return [];
    }
    
    if (!Array.isArray(transactions)) {
        console.error("normalizeTransactions: Eingabe ist kein Array", typeof transactions);
        return [];
    }

    const normalized = transactions.filter(transaction => {
        // Grundlegende Validierung
        if (!transaction || typeof transaction !== 'object') {
            console.warn('Ungültige Transaktion gefunden (kein Objekt)');
            return false;
        }
        
        // Stelle sicher, dass alle wichtigen Felder vorhanden sind
        if (transaction.Buchungsdatum === undefined) {
            console.warn('Transaktion ohne Buchungsdatum gefunden');
            transaction.Buchungsdatum = new Date(); // Fallback auf aktuelles Datum
        }
        
        if (transaction.Betrag === undefined) {
            console.warn('Transaktion ohne Betrag gefunden');
            transaction.Betrag = 0; // Fallback auf 0
        }
        
        // Stelle sicher, dass Betrag eine Zahl ist
        if (typeof transaction.Betrag !== 'number' || isNaN(transaction.Betrag)) {
            console.warn('Transaktion mit ungültigem Betrag gefunden:', transaction.Betrag);
            transaction.Betrag = 0; // Fallback auf 0
        }
        
        // Stelle sicher, dass alle wichtigen Felder vorhanden sind
        if (!transaction.Verwendungszweck) {
            transaction.Verwendungszweck = 'Keine Beschreibung';
        }
        
        // Stelle sicher, dass das Datum ein gültiges Date-Objekt ist
        if (!(transaction.Buchungsdatum instanceof Date) || isNaN(transaction.Buchungsdatum.getTime())) {
            if (typeof transaction.Buchungsdatum === 'string') {
                const parsed = formatDate(transaction.Buchungsdatum);
                if (parsed && !isNaN(parsed.getTime())) {
                    transaction.Buchungsdatum = parsed;
                } else {
                    console.warn('Transaktion mit ungültigem Datum gefunden:', transaction.Buchungsdatum);
                    transaction.Buchungsdatum = new Date(); // Fallback auf aktuelles Datum
                }
            } else {
                console.warn('Transaktion mit ungültigem Datum gefunden');
                transaction.Buchungsdatum = new Date(); // Fallback auf aktuelles Datum
            }
        }
        
        return true;
    });
    
    console.log(`Normalisierung abgeschlossen: ${normalized.length} von ${transactions.length} Transaktionen gültig`);
    return normalized;
}

/**
 * Formatiert ein Datum in ein standardisiertes Format
 */
function formatDate(dateStr) {
    if (!dateStr) return new Date(); // Fallback auf das aktuelle Datum
    
    // Entferne doppelte Anführungszeichen
    dateStr = dateStr.replace(/"/g, '').trim();
    
    // Erkenne gängige Datumsformate
    let parts;
    
    // Format: DD.MM.YYYY oder DD.MM.YY
    if (dateStr.includes('.')) {
        parts = dateStr.split('.');
        if (parts.length >= 3) {
            if (parts[2] && parts[2].length === 2) {
                parts[2] = '20' + parts[2]; // Ergänze Jahrhundert
            }
            const parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
    }
    
    // Format: YYYY-MM-DD
    if (dateStr.includes('-')) {
        parts = dateStr.split('-');
        if (parts.length >= 3) {
            if (parts[0].length === 4) {
                const parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            }
            // Format: DD-MM-YYYY
            const parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
    }
    
    // Format: DD/MM/YYYY
    if (dateStr.includes('/')) {
        parts = dateStr.split('/');
        if (parts.length >= 3) {
            const parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
    }
    
    // Versuche JavaScript-eigene Datumserkennung
    const jsDate = new Date(dateStr);
    if (!isNaN(jsDate.getTime())) {
        return jsDate;
    }
    
    // Wenn nichts funktioniert, gib das aktuelle Datum zurück
    console.warn(`Unbekanntes Datumsformat: "${dateStr}", verwende aktuelles Datum als Fallback`);
    return new Date();
}


// Mache die Funktionen global verfügbar
window.parseCSV = parseCSV;
window.parseCSVContent = parseCSVContent;
window.detectBankType = detectBankType;
window.normalizeTransactions = normalizeTransactions;
window.formatDate = formatDate;
window.parseSparkasseCSV = parseSparkasseCSV;
window.parseDKBCSV = parseDKBCSV;
window.parseINGCSV = parseINGCSV;
window.parseComdirectCSV = parseComdirectCSV;
window.parseGenericCSV = parseGenericCSV;