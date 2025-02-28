/**
 * Einstellungen für die Finanzanalyse
 */

// Einstellungen-Objekt
const settings = {
    darkMode: false,
    excludedExpenses: [],
    excludedIncome: []
};

// DOM geladen
document.addEventListener('DOMContentLoaded', async () => {
    // Elemente
    const darkModeToggle = document.getElementById('darkModeToggle');
    const tabButtons = document.querySelectorAll('.tab-button');
    const excludeExpenseSearch = document.getElementById('exclude-expense-search');
    const excludeExpenseAdd = document.getElementById('exclude-expense-add');
    const excludeIncomeSearch = document.getElementById('exclude-income-search');
    const excludeIncomeAdd = document.getElementById('exclude-income-add');
    const excludedExpensesList = document.getElementById('excluded-expenses-list');
    const excludedIncomeList = document.getElementById('excluded-income-list');
    const noExcludedExpenses = document.getElementById('no-excluded-expenses');
    const noExcludedIncome = document.getElementById('no-excluded-income');

    // Initialisierung
    init();
    
    // Tab-Wechsel-Handler
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Aktiven Button setzen
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Aktiven Tab anzeigen
            const targetId = button.getAttribute('data-target');
            document.querySelectorAll('.tab-pane').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
        });
    });
    
    // Dark-Mode-Toggle-Handler
    darkModeToggle.addEventListener('change', () => {
        settings.darkMode = darkModeToggle.checked;
        applyDarkMode();
        saveSettings();
    });
    
    // Ausgaben ausschließen
    excludeExpenseAdd.addEventListener('click', () => {
        const term = excludeExpenseSearch.value.trim();
        if (term && !settings.excludedExpenses.includes(term)) {
            settings.excludedExpenses.push(term);
            updateExcludedLists();
            saveSettings();
            excludeExpenseSearch.value = '';
        }
    });
    
    // Einnahmen ausschließen
    excludeIncomeAdd.addEventListener('click', () => {
        const term = excludeIncomeSearch.value.trim();
        if (term && !settings.excludedIncome.includes(term)) {
            settings.excludedIncome.push(term);
            updateExcludedLists();
            saveSettings();
            excludeIncomeSearch.value = '';
        }
    });
    
    // Enter-Taste für die Suchfelder
    excludeExpenseSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            excludeExpenseAdd.click();
        }
    });
    
    excludeIncomeSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            excludeIncomeAdd.click();
        }
    });
    
    // Initialisiert die Einstellungen
    function init() {
        loadSettings();
        updateExcludedLists();
        applyDarkMode();
    }
    
    // Lädt die Einstellungen aus dem localStorage
    function loadSettings() {
        const savedSettings = localStorage.getItem('financeAppSettings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            settings.darkMode = parsedSettings.darkMode || false;
            settings.excludedExpenses = parsedSettings.excludedExpenses || [];
            settings.excludedIncome = parsedSettings.excludedIncome || [];
        }
        
        // UI aktualisieren
        darkModeToggle.checked = settings.darkMode;
    }
    
    // Speichert die Einstellungen im localStorage
    function saveSettings() {
        localStorage.setItem('financeAppSettings', JSON.stringify(settings));
    }
    
    // Aktualisiert die Listen der ausgeschlossenen Einträge
    function updateExcludedLists() {
        // Ausgaben
        excludedExpensesList.innerHTML = '';
        if (settings.excludedExpenses.length > 0) {
            noExcludedExpenses.style.display = 'none';
            settings.excludedExpenses.forEach(term => {
                const li = createExcludeListItem(term, 'expense');
                excludedExpensesList.appendChild(li);
            });
        } else {
            noExcludedExpenses.style.display = 'block';
        }
        
        // Einnahmen
        excludedIncomeList.innerHTML = '';
        if (settings.excludedIncome.length > 0) {
            noExcludedIncome.style.display = 'none';
            settings.excludedIncome.forEach(term => {
                const li = createExcludeListItem(term, 'income');
                excludedIncomeList.appendChild(li);
            });
        } else {
            noExcludedIncome.style.display = 'block';
        }
    }
    
    // Erstellt ein Listenelement mit Löschfunktion
    function createExcludeListItem(term, type) {
        const li = document.createElement('li');
        li.className = 'excluded-item';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = term;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Entfernen';
        
        deleteBtn.addEventListener('click', () => {
            if (type === 'expense') {
                settings.excludedExpenses = settings.excludedExpenses.filter(t => t !== term);
            } else {
                settings.excludedIncome = settings.excludedIncome.filter(t => t !== term);
            }
            updateExcludedLists();
            saveSettings();
        });
        
        li.appendChild(textSpan);
        li.appendChild(deleteBtn);
        
        return li;
    }
    
    // Wendet den Dark-Mode an
    function applyDarkMode() {
        if (settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
});