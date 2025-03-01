/**
 * Datenbank-Management für den Finanzanalysator
 */
const db = {
    instance: null,
    DB_NAME: 'FinanceAnalyzerDB',
    DB_VERSION: 1,
    
    // Datenbank initialisieren
    async init() {
        return new Promise((resolve, reject) => {
            if (this.instance) {
                resolve(this.instance);
                return;
            }
            
            console.log('Initialisiere Datenbank...');
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            // Neue DB erstellen oder aktualisieren
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Erstelle einen Object Store für Transaktionen
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    transactionStore.createIndex('date', 'Buchungsdatum', { unique: false });
                    transactionStore.createIndex('amount', 'Betrag', { unique: false });
                }
                
                // Erstelle einen Object Store für importierte Dateien
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
                    fileStore.createIndex('name', 'name', { unique: false });
                    fileStore.createIndex('date', 'importDate', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.instance = event.target.result;
                console.log('Datenbank erfolgreich initialisiert');
                resolve(this.instance);
            };
            
            request.onerror = (event) => {
                console.error('Fehler bei der Datenbank-Initialisierung:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Transaktionen speichern
    async saveTransactions(transactions, originalFileName) {
        console.log("DB: saveTransactions aufgerufen");
        console.log("DB: Transaktionstyp:", typeof transactions);
        console.log("DB: Ist Array:", Array.isArray(transactions));
        
        // Sicherheitscheck
        if (!Array.isArray(transactions)) {
            console.error("DB FEHLER: transactions ist kein Array");
            return Promise.reject(new Error('transactions muss ein Array sein'));
        }
        
        // Überprüfe, ob das Array Elemente enthält
        if (transactions.length === 0) {
            console.warn('DB WARNUNG: Keine Transaktionen zum Speichern vorhanden');
            return Promise.reject(new Error('Keine Transaktionen zum Speichern vorhanden'));
        }
        
        const db = await this.init();
        return new Promise((resolve, reject) => {
            try {
                console.log("DB: Starte Transaktion");
                
                // Zeitraum der Transaktionen ermitteln
                const dates = transactions.map(t => t.Buchungsdatum).filter(date => date instanceof Date);
                
                if (dates.length === 0) {
                    return reject(new Error('Keine gültigen Datumsangaben in den Transaktionen gefunden'));
                }
                
                // Min- und Max-Datum finden
                const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                
                // Format: Monat und Jahr extrahieren
                const minMonth = minDate.getMonth() + 1; // JavaScript Monate sind 0-basiert
                const minYear = minDate.getFullYear();
                const maxMonth = maxDate.getMonth() + 1;
                const maxYear = maxDate.getFullYear();
                
                // Deutsche Monatsnamen
                const monthNames = [
                    "Januar", "Februar", "März", "April", "Mai", "Juni",
                    "Juli", "August", "September", "Oktober", "November", "Dezember"
                ];
                
                // Dateiname generieren
                let fileName;
                if (minYear === maxYear && minMonth === maxMonth) {
                    // Gleicher Monat
                    fileName = `Umsatzübersicht ${minYear} ${monthNames[minMonth-1]}`;
                } else {
                    // Zeitraum über mehrere Monate
                    fileName = `Umsatzübersicht ${minYear} ${monthNames[minMonth-1]} bis ${maxYear} ${monthNames[maxMonth-1]}`;
                }
                
                console.log(`Generierter Dateiname: ${fileName} (Original: ${originalFileName})`);
                
                const transaction = db.transaction(['transactions', 'files'], 'readwrite');
                const transactionStore = transaction.objectStore('transactions');
                const fileStore = transaction.objectStore('files');
                
                // Speichere Informationen über die importierte Datei mit neuem Namen
                const fileRecord = {
                    name: fileName,
                    originalName: originalFileName,
                    importDate: new Date(),
                    transactionCount: transactions.length,
                    startDate: minDate,
                    endDate: maxDate
                };
                
                const fileRequest = fileStore.add(fileRecord);
                
                fileRequest.onsuccess = (event) => {
                    const fileId = event.target.result;
                    
                    // Füge Transaktionen hinzu mit Referenz zur Datei
                    let successCount = 0;
                    
                    transactions.forEach(transaction => {
                        // Füge fileId als Referenz hinzu
                        const transactionWithFileId = { 
                            ...transaction, 
                            fileId 
                        };
                        
                        const request = transactionStore.add(transactionWithFileId);
                        
                        request.onsuccess = () => {
                            successCount++;
                            if (successCount === transactions.length) {
                                console.log(`${successCount} Transaktionen gespeichert`);
                                resolve(fileId);
                            }
                        };
                        
                        request.onerror = (event) => {
                            console.error('Fehler beim Speichern einer Transaktion:', event.target.error);
                        };
                    });
                };
                
                fileRequest.onerror = (event) => {
                    console.error('Fehler beim Speichern der Dateiinformationen:', event.target.error);
                    reject(event.target.error);
                };
                
                transaction.oncomplete = () => {
                    console.log('Transaktion abgeschlossen');
                };
                
                transaction.onerror = (event) => {
                    console.error('Fehler bei der Transaktion:', event.target.error);
                    reject(event.target.error);
                };
                
            } catch (error) {
                console.error("DB: Unbehandelter Fehler in saveTransactions:", error);
                reject(error);
            }
        });
    },

    // Alle gespeicherten Dateien abrufen
    async getImportedFiles() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['files'], 'readonly');
            const fileStore = transaction.objectStore('files');
            const request = fileStore.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    // Alle Transaktionen einer Datei abrufen
    async getTransactionsByFileId(fileId) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const transactions = [];
            
            // Da wir keinen Index für fileId haben, müssen wir alle durchsuchen
            const cursorRequest = store.openCursor();
            
            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.fileId === fileId) {
                        transactions.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(transactions);
                }
            };
            
            cursorRequest.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    // Datei und zugehörige Transaktionen löschen
    async deleteFile(fileId) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['files', 'transactions'], 'readwrite');
            const fileStore = transaction.objectStore('files');
            const transactionStore = transaction.objectStore('transactions');
            
            // Lösche die Datei
            const fileRequest = fileStore.delete(fileId);
            fileRequest.onerror = (event) => {
                console.error('Fehler beim Löschen der Datei:', event.target.error);
            };
            
            // Lösche zugehörige Transaktionen
            const cursorRequest = transactionStore.openCursor();
            
            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.fileId === fileId) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };
            
            cursorRequest.onerror = (event) => {
                console.error('Fehler beim Durchsuchen der Transaktionen:', event.target.error);
            };
            
            transaction.oncomplete = () => {
                console.log('Datei und zugehörige Transaktionen gelöscht');
                resolve();
            };
            
            transaction.onerror = (event) => {
                console.error('Fehler beim Löschen:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // Alias für saveTransactions (um Kompatibilität mit älterem Code zu gewährleisten)
    async saveImportedFile(transactions, fileName) {
        console.log("DB: saveImportedFile (Alias) aufgerufen");
        // Prüfe nochmal explizit den Typ
        if (!Array.isArray(transactions)) {
            console.error("DB FEHLER in saveImportedFile: transactions ist kein Array:", typeof transactions);
            return Promise.reject(new Error('transactions muss ein Array sein'));
        }
        // Rufe die eigentliche Funktion mit denselben Argumenten auf
        return this.saveTransactions(transactions, fileName);
    }
};