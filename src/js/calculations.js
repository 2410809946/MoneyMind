/**
 * Berechnet grundlegende Statistiken aus Transaktionsdaten
 * @param {Array} transactions - Array mit Transaktionsdaten
 * @returns {Object} Objekt mit berechneten Statistiken
 */
function calculateStatistics(transactions) {
    // Prüfe, ob Transaktionen vorhanden sind und ein Array sind
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.warn("Keine gültigen Transaktionen gefunden oder kein Array");
        return {
            count: 0,
            income: 0,
            expenses: 0,
            balance: 0,
            startDate: '-',
            endDate: '-',
            categories: {}
        };
    }
    
    // Initialisiere Statistik-Objekt
    const stats = {
        count: transactions.length,
        income: 0,
        expenses: 0,
        balance: 0,
        categories: {}
    };
    
    // Zeitraum ermitteln - mit Fehlerbehandlung
    let dates = [];
    try {
        dates = transactions
            .filter(t => t && t.Buchungsdatum)
            .map(t => new Date(t.Buchungsdatum))
            .filter(d => !isNaN(d.getTime()));
    } catch (error) {
        console.error("Fehler bei der Datumsberechnung:", error);
    }
    
    if (dates.length > 0) {
        try {
            const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
            
            stats.startDate = startDate.toLocaleDateString();
            stats.endDate = endDate.toLocaleDateString();
        } catch (error) {
            console.error("Fehler bei der Bestimmung des Zeitraums:", error);
            stats.startDate = '-';
            stats.endDate = '-';
        }
    } else {
        stats.startDate = '-';
        stats.endDate = '-';
    }
    
    // Rest der Funktion bleibt gleich
    // ...
    
    // Einnahmen und Ausgaben berechnen
    transactions.forEach(transaction => {
        const amount = transaction.Betrag;
        
        if (amount > 0) {
            // Einnahme
            stats.income += amount;
        } else if (amount < 0) {
            // Ausgabe (als positiven Betrag speichern)
            stats.expenses += Math.abs(amount);
        }
        
        // Kategorie bestimmen (einfache Heuristik)
        let category = determineCategory(transaction);
        if (!stats.categories[category]) {
            stats.categories[category] = {
                total: 0,
                count: 0
            };
        }
        
        stats.categories[category].total += Math.abs(amount);
        stats.categories[category].count++;
    });
    
    // Gesamtsaldo berechnen
    stats.balance = stats.income - stats.expenses;
    
    return stats;
}

/**
 * Bestimmt eine Kategorie für eine Transaktion
 * @param {Object} transaction - Die Transaktion
 * @returns {String} Die ermittelte Kategorie
 */
function determineCategory(transaction) {
    const keywords = {
        "Lebensmittel": ["supermarkt", "aldi", "lidl", "rewe", "edeka", "kaufland", "netto", "lebensmittel"],
        "Wohnen": ["miete", "strom", "gas", "wasser", "nebenkosten", "hausverwaltung", "wohnung"],
        "Transport": ["benzin", "tankstelle", "auto", "kfz", "versicherung", "bahn", "ticket", "fahrschein"],
        "Unterhaltung": ["kino", "restaurant", "café", "bar", "club", "veranstaltung"],
        "Einkommen": ["gehalt", "lohn", "einkommen", "überweisung", "zinsen", "dividende"],
        "Gesundheit": ["apotheke", "arzt", "medizin", "krankenhaus", "therapie", "versicherung"],
        "Bildung": ["schule", "studium", "kurs", "seminar", "buch"],
        "Kleidung": ["h&m", "zara", "c&a", "mode", "kleidung", "schuhe"],
        "Telekommunikation": ["handy", "telefon", "mobilfunk", "internet", "dsl", "vodafone", "telekom", "o2"]
    };
    
    // Text für Kategoriebestimmung
    const text = [
        transaction.Verwendungszweck,
        transaction.Text,
        transaction.Empfängername,
        transaction.Auftraggebername
    ].filter(Boolean).join(" ").toLowerCase();
    
    // Prüfe auf Schlüsselwörter
    for (const [category, words] of Object.entries(keywords)) {
        if (words.some(word => text.includes(word))) {
            return category;
        }
    }
    
    // Fallback-Kategorien
    if (transaction.Betrag > 0) {
        return "Sonstige Einnahmen";
    } else {
        return "Sonstige Ausgaben";
    }
}

/**
 * Kategorisiert ein Array von Transaktionen
 * @param {Array} transactions - Array mit Transaktionsdaten
 * @returns {Object} Objekt mit Transaktionen nach Kategorien
 */
function categorizeTransactions(transactions) {
    const categorized = {};
    
    transactions.forEach(transaction => {
        const category = determineCategory(transaction);
        
        if (!categorized[category]) {
            categorized[category] = [];
        }
        
        categorized[category].push(transaction);
    });
    
    return categorized;
}

/**
 * Berechnet monatliche Summen für Einnahmen und Ausgaben
 * @param {Array} transactions - Array mit Transaktionsdaten
 * @returns {Object} Objekt mit monatlichen Summen
 */
function calculateMonthlySummary(transactions) {
    const monthlySummary = {};
    
    transactions.forEach(transaction => {
        if (!transaction.Buchungsdatum) return;
        
        const date = new Date(transaction.Buchungsdatum);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlySummary[yearMonth]) {
            monthlySummary[yearMonth] = {
                income: 0,
                expenses: 0,
                balance: 0,
                transactions: []
            };
        }
        
        const amount = transaction.Betrag;
        
        if (amount > 0) {
            monthlySummary[yearMonth].income += amount;
        } else {
            monthlySummary[yearMonth].expenses += Math.abs(amount);
        }
        
        monthlySummary[yearMonth].balance = monthlySummary[yearMonth].income - monthlySummary[yearMonth].expenses;
        monthlySummary[yearMonth].transactions.push(transaction);
    });
    
    return monthlySummary;
}