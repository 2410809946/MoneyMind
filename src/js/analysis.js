/**
 * Finanzanalyse - Auswertungsfunktionen
 */

// Speichert den aktuellen Filter-Status
const analysisState = {
    startDate: null,
    endDate: null,
    allTransactions: [],
    filteredTransactions: [],
    chart: null,
    expensesParetoChart: null,
    incomeParetoChart: null
};

// DOM geladen
document.addEventListener('DOMContentLoaded', async () => {
    // Elemente
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const summaryStatsDiv = document.getElementById('summary-stats');
    const transactionsBody = document.getElementById('transactionsBody');

    // Am Ende des DOMContentLoaded-Events, nach Initialisierung aller Funktionen:
    // Wende Dark Mode direkt nach dem Laden an
    const settings = loadSettings();
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
    }




    // Initialisiere Datenbank und lade alle Transaktionen
    try {
        await db.init();
        await loadAllTransactions();
        
        // Setze Standard-Datumswerte (letzten 3 Monate)
        setDefaultDateRange();
        
        // Wende den ersten Filter an
        applyFilter();
        
        // Initialisiere Pareto-Dashboards
        initParetoDashboard();
    } catch (error) {
        console.error('Fehler beim Initialisieren der Analyse:', error);
    }
    
    // Event-Handler
    applyFilterBtn.addEventListener('click', applyFilter);
    
    // Lädt alle Transaktionen aus allen gespeicherten Dateien
    async function loadAllTransactions() {
        try {
            // Hole alle Dateien
            const files = await db.getImportedFiles();
            let allTransactions = [];
            
            // Lade Transaktionen für jede Datei
            for (const file of files) {
                const fileTransactions = await db.getTransactionsByFileId(file.id);
                allTransactions = allTransactions.concat(fileTransactions);
            }
            
            // Sortiere nach Datum
            allTransactions.sort((a, b) => new Date(a.Buchungsdatum) - new Date(b.Buchungsdatum));
            
            analysisState.allTransactions = allTransactions;
            console.log(`Insgesamt ${allTransactions.length} Transaktionen geladen`);
            
            return allTransactions;
        } catch (error) {
            console.error('Fehler beim Laden aller Transaktionen:', error);
            return [];
        }
    }
    
    // Setzt die Standard-Datumsbereich auf die letzten 3 Monate
    function setDefaultDateRange() {
        const today = new Date();
        
        // Endddatum = heute
        const endDate = new Date(today);
        
        // Startdatum = 3 Monate zurück
        const startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        
        // Formatiere die Daten für die Eingabefelder (YYYY-MM-DD)
        startDateInput.value = formatDateForInput(startDate);
        endDateInput.value = formatDateForInput(endDate);
        
        // Speichere im State
        analysisState.startDate = startDate;
        analysisState.endDate = endDate;
    }
    
    // Formatiert ein Datum für das input[type=date]
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    

// Wendet den Filter an und aktualisiert die Ansicht
function applyFilter() {
    // Hole Datumswerte
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    endDate.setHours(23, 59, 59, 999); // Bis zum Ende des Tages
    
    console.log(`Filter anwenden: ${startDate.toLocaleDateString()} bis ${endDate.toLocaleDateString()}`);
    
    // Speichere im State
    analysisState.startDate = startDate;
    analysisState.endDate = endDate;
    
    // Lade Einstellungen für Ausschlüsse
    const settings = loadSettings();
    
    // Filtere Transaktionen nach Datum und Ausschlussregeln
    analysisState.filteredTransactions = analysisState.allTransactions.filter(transaction => {
        const date = new Date(transaction.Buchungsdatum);
        
        // Datum-Filter
        if (date < startDate || date > endDate) return false;
        
        // Prüfe auf ausgeschlossene Einnahmen
        if (transaction.Betrag > 0) {
            // Ermittle den Sender
            const sender = transaction['Auftraggebername'] || 
                          (transaction.Text && extractSenderFromText(transaction.Text)) ||
                          extractSenderFromPurpose(transaction.Verwendungszweck) ||
                          '';
                          
            // Prüfe, ob der Sender in den ausgeschlossenen Einnahmen enthalten ist
            for (const term of settings.excludedIncome) {
                if (sender.toLowerCase().includes(term.toLowerCase())) {
                    return false;
                }
            }
        }
        
        // Prüfe auf ausgeschlossene Ausgaben
        if (transaction.Betrag < 0) {
            // Ermittle den Empfänger
            const recipient = transaction['Empfängername'] || 
                             (transaction.Text && extractRecipientFromText(transaction.Text)) ||
                             extractRecipientFromPurpose(transaction.Verwendungszweck) ||
                             '';
                             
            // Prüfe, ob der Empfänger in den ausgeschlossenen Ausgaben enthalten ist
            for (const term of settings.excludedExpenses) {
                if (recipient.toLowerCase().includes(term.toLowerCase())) {
                    return false;
                }
            }
        }
        
        // Wenn alle Filter bestanden wurden, behalte die Transaktion
        return true;
    });
    
    console.log(`${analysisState.filteredTransactions.length} Transaktionen nach Filterung`);
    
    // Aktualisiere UI
    updateSummary();
    updateChart();
    updateParetoCharts();
    updateTransactionsTable();
    
    // Wende Dark Mode an, falls aktiviert
    const darkMode = settings.darkMode;
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Lädt die Einstellungen aus dem localStorage
function loadSettings() {
    const defaultSettings = {
        darkMode: false,
        excludedExpenses: [],
        excludedIncome: []
    };
    
    const savedSettings = localStorage.getItem('financeAppSettings');
    if (savedSettings) {
        try {
            return JSON.parse(savedSettings);
        } catch (e) {
            console.error('Fehler beim Parsen der Einstellungen:', e);
            return defaultSettings;
        }
    }
    
    return defaultSettings;
}





    // Aktualisiert die Zusammenfassung
    function updateSummary() {
        const transactions = analysisState.filteredTransactions;
        const income = transactions
            .filter(t => t.Betrag > 0)
            .reduce((sum, t) => sum + t.Betrag, 0);
        
        const expenses = transactions
            .filter(t => t.Betrag < 0)
            .reduce((sum, t) => sum + Math.abs(t.Betrag), 0);
        
        const balance = income - expenses;
        
        // Stats HTML
        summaryStatsDiv.innerHTML = `
            <div class="stat-box">
                <h3>Einnahmen</h3>
                <div class="stat-value income">${income.toFixed(2)} €</div>
            </div>
            <div class="stat-box">
                <h3>Ausgaben</h3>
                <div class="stat-value expense">${expenses.toFixed(2)} €</div>
            </div>
            <div class="stat-box">
                <h3>Saldo</h3>
                <div class="stat-value ${balance >= 0 ? 'income' : 'expense'}">${balance.toFixed(2)} €</div>
            </div>
            <div class="stat-box">
                <h3>Transaktionen</h3>
                <div class="stat-value">${transactions.length}</div>
            </div>
        `;
    }
    

// Aktualisiert das Chart
function updateChart() {
    // Gruppiere Daten nach Tagen statt nach Monaten
    const transactions = analysisState.filteredTransactions;
    const dailyData = groupTransactionsByDay(transactions);
    
    // Bereite Daten für Chart vor
    const labels = Object.keys(dailyData).sort();
    const balanceData = [];
    const incomeData = [];
    const expenseData = [];
    
    labels.forEach(day => {
        const dayData = dailyData[day];
        const income = dayData.filter(t => t.Betrag > 0).reduce((sum, t) => sum + t.Betrag, 0);
        const expenses = dayData.filter(t => t.Betrag < 0).reduce((sum, t) => sum + t.Betrag, 0); // Behalte negative Werte
        const balance = income + expenses; // Da expenses bereits negativ sind, addieren wir sie
        
        balanceData.push(balance);
        incomeData.push(income);
        expenseData.push(expenses);
    });
    
    // Chart erstellen/aktualisieren
    const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
    
    // Wenn bereits ein Chart existiert, zerstören
    if (analysisState.chart) {
        analysisState.chart.destroy();
    }
    
    // Neues Chart erstellen - kombiniertes Diagramm
    analysisState.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(formatDayLabel),
            datasets: [
                {
                    label: 'Saldo',
                    data: balanceData,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Einnahmen',
                    data: incomeData,
                    backgroundColor: 'rgba(75, 192, 192, 0)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.1,
                    pointRadius: 3
                },
                {
                    label: 'Ausgaben',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 99, 132, 0)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.1,
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Betrag (€)'
                    },
                    grid: {
                        color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Datum'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value.toFixed(2)} €`;
                        }
                    }
                }
            }
        }
    });
}

// Gruppiert Transaktionen nach Tag
function groupTransactionsByDay(transactions) {
    const grouped = {};
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.Buchungsdatum);
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (!grouped[dayKey]) {
            grouped[dayKey] = [];
        }
        
        grouped[dayKey].push(transaction);
    });
    
    return grouped;
}

// Formatiert ein Tagesschlüssel (YYYY-MM-DD) zu einem lesbaren Label (DD.MM.)
function formatDayLabel(dayKey) {
    const [year, month, day] = dayKey.split('-');
    return `${day}.${month}.`;
}



    
    // Formatiert ein Monatsschlüssel (YYYY-MM) zu einem lesbaren Label (MM/YYYY)
    function formatMonthLabel(monthKey) {
        const [year, month] = monthKey.split('-');
        return `${month}/${year}`;
    }
    
    // Gruppiert Transaktionen nach Monat
    function groupTransactionsByMonth(transactions) {
        const grouped = {};
        
        transactions.forEach(transaction => {
            const date = new Date(transaction.Buchungsdatum);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!grouped[monthKey]) {
                grouped[monthKey] = [];
            }
            
            grouped[monthKey].push(transaction);
        });
        
        return grouped;
    }
    
    // Aktualisiert die Transaktionsliste
    function updateTransactionsTable() {
        const transactions = analysisState.filteredTransactions;
        let tableHtml = '';
        
        // Maximal 50 Transaktionen anzeigen (neueste zuerst)
        const transactionsToShow = [...transactions]
            .sort((a, b) => new Date(b.Buchungsdatum) - new Date(a.Buchungsdatum))
            .slice(0, 50);
        
        transactionsToShow.forEach(transaction => {
            const date = new Date(transaction.Buchungsdatum).toLocaleDateString();
            const description = transaction.Text || transaction.Verwendungszweck || 
                                (transaction['Auftraggebername'] ? `Von: ${transaction['Auftraggebername']}` : 
                                (transaction['Empfängername'] ? `An: ${transaction['Empfängername']}` : 'Keine Beschreibung'));
            
            const amount = transaction.Betrag;
            const isPositive = amount >= 0;
            
            tableHtml += `
                <tr>
                    <td>${date}</td>
                    <td>${description}</td>
                    <td class="${isPositive ? 'income' : 'expense'}">${amount.toFixed(2)} €</td>
                </tr>
            `;
        });
        
        if (transactions.length === 0) {
            tableHtml = `<tr><td colspan="3" class="no-data">Keine Transaktionen im gewählten Zeitraum</td></tr>`;
        } else if (transactions.length > 50) {
            const remaining = transactions.length - 50;
            tableHtml += `<tr><td colspan="3" class="more-data">+ ${remaining} weitere Transaktionen (nicht angezeigt)</td></tr>`;
        }
        
        transactionsBody.innerHTML = tableHtml;
    }
    
    // Pareto-Charts verwalten
    function initParetoDashboard() {
        // Tab-Wechsel-Handler
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Aktive Tab-Klasse umschalten
                document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Aktives Chart anzeigen
                const targetId = tab.dataset.target;
                document.querySelectorAll('.pareto-chart').forEach(chart => {
                    chart.classList.remove('active');
                });
                document.getElementById(targetId).classList.add('active');
            });
        });
        
        // Top-Limit-Handler für Ausgaben
        document.getElementById('expenses-limit').addEventListener('change', () => {
            updateParetoCharts();
        });
        
        // Top-Limit-Handler für Einnahmen
        document.getElementById('income-limit').addEventListener('change', () => {
            updateParetoCharts();
        });
    }
    
    // Pareto-Charts aktualisieren
    function updateParetoCharts() {
        updateExpensesPareto();
        updateIncomePareto();
    }
    
    // Ausgaben-Pareto aktualisieren
    function updateExpensesPareto() {
        const transactions = analysisState.filteredTransactions;
        const expenses = transactions.filter(t => t.Betrag < 0);
        
        if (expenses.length === 0) {
            // Keine Ausgaben vorhanden
            return;
        }
        
        // Nach Empfänger gruppieren
        const groupedExpenses = groupByRecipient(expenses);
        
        // Sortieren und Top-N auswählen
        const limitSelector = document.getElementById('expenses-limit');
        const limit = limitSelector.value === 'all' ? groupedExpenses.length : parseInt(limitSelector.value);
        
        // Sortierte Daten (absteigend nach Betrag)
        const sortedData = groupedExpenses
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
        
        // Berechne Gesamtausgaben für Prozentangaben
        const totalAmount = sortedData.reduce((sum, item) => sum + item.amount, 0);
        
        // Daten für Pareto-Chart vorbereiten
        const labels = sortedData.map(item => truncateLabel(item.name));
        const amounts = sortedData.map(item => item.amount);
        
        // Kumulierte Prozentsätze berechnen
        let cumulativeSum = 0;
        const cumulativePercentages = amounts.map(amount => {
            cumulativeSum += amount;
            return (cumulativeSum / totalAmount) * 100;
        });
        
        // Chart erstellen/aktualisieren
        createParetoChart(
            'expensesParetoChart', 
            labels, 
            amounts.map(a => Math.abs(a)), // Positive Werte für die Darstellung
            cumulativePercentages,
            'Ausgaben (€)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 99, 132, 1)'
        );
    }
    
    // Einnahmen-Pareto aktualisieren
    function updateIncomePareto() {
        const transactions = analysisState.filteredTransactions;
        const income = transactions.filter(t => t.Betrag > 0);
        
        if (income.length === 0) {
            // Keine Einnahmen vorhanden
            return;
        }
        
        // Nach Auftraggeber gruppieren
        const groupedIncome = groupBySender(income);
        
        // Sortieren und Top-N auswählen
        const limitSelector = document.getElementById('income-limit');
        const limit = limitSelector.value === 'all' ? groupedIncome.length : parseInt(limitSelector.value);
        
        // Sortierte Daten (absteigend nach Betrag)
        const sortedData = groupedIncome
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
        
        // Berechne Gesamteinnahmen für Prozentangaben
        const totalAmount = sortedData.reduce((sum, item) => sum + item.amount, 0);
        
        // Daten für Pareto-Chart vorbereiten
        const labels = sortedData.map(item => truncateLabel(item.name));
        const amounts = sortedData.map(item => item.amount);
        
        // Kumulierte Prozentsätze berechnen
        let cumulativeSum = 0;
        const cumulativePercentages = amounts.map(amount => {
            cumulativeSum += amount;
            return (cumulativeSum / totalAmount) * 100;
        });
        
        // Chart erstellen/aktualisieren
        createParetoChart(
            'incomeParetoChart', 
            labels, 
            amounts,
            cumulativePercentages,
            'Einnahmen (€)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(75, 192, 192, 1)'
        );
    }
    
    // Gruppiert Ausgaben nach Empfänger
    function groupByRecipient(transactions) {
        const grouped = {};
        
        transactions.forEach(transaction => {
            // Empfänger bestimmen (verschiedene Felder prüfen)
            let recipient = transaction['Empfängername'] || 
                           (transaction.Text && extractRecipientFromText(transaction.Text)) ||
                           extractRecipientFromPurpose(transaction.Verwendungszweck) ||
                           'Sonstiger Empfänger';
                           
            if (!recipient || recipient.trim() === '') {
                recipient = 'Sonstiger Empfänger';
            }
            
            recipient = recipient.trim();
            
            if (!grouped[recipient]) {
                grouped[recipient] = {
                    name: recipient,
                    amount: 0,
                    count: 0
                };
            }
            
            grouped[recipient].amount += Math.abs(transaction.Betrag);
            grouped[recipient].count++;
        });
        
        return Object.values(grouped);
    }
    
    // Gruppiert Einnahmen nach Absender
    function groupBySender(transactions) {
        const grouped = {};
        
        transactions.forEach(transaction => {
            // Auftraggeber bestimmen (verschiedene Felder prüfen)
            let sender = transaction['Auftraggebername'] || 
                        (transaction.Text && extractSenderFromText(transaction.Text)) ||
                        extractSenderFromPurpose(transaction.Verwendungszweck) ||
                        'Sonstige Einnahme';
                        
            if (!sender || sender.trim() === '') {
                sender = 'Sonstige Einnahme';
            }
            
            sender = sender.trim();
            
            if (!grouped[sender]) {
                grouped[sender] = {
                    name: sender,
                    amount: 0,
                    count: 0
                };
            }
            
            grouped[sender].amount += transaction.Betrag;
            grouped[sender].count++;
        });
        
        return Object.values(grouped);
    }
    
    // Extrahiert Empfänger aus Textfeldern (vereinfacht)
    function extractRecipientFromText(text) {
        if (!text) return null;
        
        // Typische Muster für Ausgabenbeschreibungen
        const matches = text.match(/(?:bei|an|für|in)\s+([A-Z0-9\s]+)(?:\s|$)/i);
        if (matches && matches[1]) {
            return matches[1].trim();
        }
        
        // Falls kein Muster gefunden wurde, gib die ersten 20 Zeichen zurück
        return text.substring(0, 20).trim();
    }
    
    // Extrahiert Sender aus Textfeldern (vereinfacht)
    function extractSenderFromText(text) {
        if (!text) return null;
        
        // Typische Muster für Einnahmenbeschreibungen
        const matches = text.match(/(?:von|durch|aus)\s+([A-Z0-9\s]+)(?:\s|$)/i);
        if (matches && matches[1]) {
            return matches[1].trim();
        }
        
        return text.substring(0, 20).trim();
    }
    
    // Extrahiert Informationen aus Verwendungszweck
    function extractRecipientFromPurpose(purpose) {
        if (!purpose) return null;
        
        // POS-Zahlungen oft enthalten bestimmte Muster
        if (purpose.includes('POS')) {
            const posMatch = purpose.match(/POS\s+[0-9]+\s+[A-Z0-9]+\s+[0-9:.]+\s+([A-Z0-9\s]+)/i);
            if (posMatch && posMatch[1]) {
                return posMatch[1].trim();
            }
        }
        
        return purpose.substring(0, 20).trim();
    }
    
    // Extrahiert Informationen aus Verwendungszweck für Sender
    function extractSenderFromPurpose(purpose) {
        if (!purpose) return null;
        return purpose.substring(0, 20).trim();
    }
    
    // Kürzt lange Labels für die Anzeige
    function truncateLabel(label, maxLength = 15) {
        if (label.length <= maxLength) return label;
        return label.substring(0, maxLength) + '...';
    }
    
    // Erstellt ein Pareto-Chart (Balken + Linie)
    function createParetoChart(canvasId, labels, values, cumulativePercentages, yAxisLabel, barColor, lineColor) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // Wenn bereits ein Chart existiert, zerstören
        if (analysisState[canvasId]) {
            analysisState[canvasId].destroy();
        }
        
        // Neues Chart erstellen
        analysisState[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Betrag',
                        data: values,
                        backgroundColor: barColor,
                        borderColor: barColor.replace('0.6', '1'),
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: 'Kumulativer %',
                        data: cumulativePercentages,
                        borderColor: lineColor,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: yAxisLabel
                        },
                        position: 'left'
                    },
                    y1: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Kumulativer Prozentsatz'
                        },
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const datasetLabel = context.dataset.label;
                                const value = context.raw;
                                
                                if (datasetLabel === 'Betrag') {
                                    return `${datasetLabel}: ${value.toFixed(2)} €`;
                                } else {
                                    return `${datasetLabel}: ${value.toFixed(1)}%`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }
});