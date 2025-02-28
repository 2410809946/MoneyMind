/**
 * Chart-Erstellung für die Finanzanalyse
 * Benötigt Chart.js: https://cdn.jsdelivr.net/npm/chart.js
 */
const charts = {
    currentChart: null,

    // Monatsübersicht erstellen
    createMonthlyOverview(groupedData, calculationsObj) {
        const canvas = document.getElementById('chartCanvas');
        const ctx = canvas.getContext('2d');
        
        // Wenn bereits ein Chart existiert, diesen zerstören
        if (this.currentChart) {
            this.currentChart.destroy();
        }
        
        // Daten für das Chart vorbereiten
        const months = Object.keys(groupedData).sort();
        const incomeData = [];
        const expensesData = [];
        
        months.forEach(month => {
            const monthData = groupedData[month];
            incomeData.push(calculationsObj.calculateIncome(monthData));
            expensesData.push(calculationsObj.calculateExpenses(monthData));
        });
        
        // Chart erstellen
        this.currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months.map(month => {
                    const [year, monthNum] = month.split('-');
                    return `${monthNum}/${year}`;
                }),
                datasets: [
                    {
                        label: 'Einnahmen',
                        data: incomeData,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Ausgaben',
                        data: expensesData,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Betrag (€)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Monat'
                        }
                    }
                }
            }
        });
    }
};