const API_BASE_URL = 'https://expense-tracker-backend-fzm1.onrender.com/api';

// Protect route - redirect to login if not authenticated
if (!isUserLoggedIn() && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html') && !window.location.pathname.includes('index.html')) {
    // For add-expense, history, dashboard - require login
    const currentPage = window.location.pathname;
    if (currentPage.includes('add-expense') || currentPage.includes('history') || currentPage.includes('dashboard')) {
        window.location.href = 'login.html';
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
}

// Helper function to get current month in YYYY-MM format
function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Helper function to get authorization headers
function getAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

// Smooth scrolling support for anchor links
const navLinks = document.querySelectorAll('nav a');
navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        if (this.hash !== '') {
            e.preventDefault();
            const target = document.querySelector(this.hash);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});

// ==================== ADD EXPENSE FORM ====================
const expenseForm = document.getElementById('expenseForm');
if (expenseForm) {
    expenseForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (!this.checkValidity()) {
            this.classList.add('was-validated');
            return;
        }

        try {
            const title = document.getElementById('expenseTitle').value;
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const category = document.getElementById('expenseCategory').value;
            const date = document.getElementById('expenseDate').value;
            const notes = document.getElementById('expenseNotes').value;

            const response = await fetch(`${API_BASE_URL}/expenses`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title,
                    amount,
                    category,
                    date,
                    notes
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Expense added successfully!');
                this.classList.remove('was-validated');
                this.reset();
                // Reload expense history if available
                if (typeof loadExpenseHistory === 'function') {
                    loadExpenseHistory();
                }
            } else {
                alert('❌ Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Failed to add expense: ' + error.message);
        }
    });
}

// ==================== EXPENSE HISTORY ====================
const historySearch = document.getElementById('historySearch');
const categoryFilter = document.getElementById('categoryFilter');
const monthFilter = document.getElementById('monthFilter');
const historyTable = document.getElementById('historyTable');
const paginationContainer = document.getElementById('paginationContainer');
let currentPage = 1;
const rowsPerPage = 5;
let allExpenses = [];

async function loadExpenseHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/expenses`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            allExpenses = data.data || [];
            renderHistoryTable(allExpenses);
            filterTable();
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

function renderHistoryTable(expenses) {
    if (!historyTable) return;
    
    const tbody = historyTable.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const formattedDate = expenseDate.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const row = document.createElement('tr');
        row.dataset.title = expense.title;
        row.dataset.category = expense.category;
        row.dataset.date = expense.date;
        row.innerHTML = `
            <td>${expense.title}</td>
            <td><span class="badge bg-primary">${expense.category}</span></td>
            <td>${formatCurrency(expense.amount)}</td>
            <td>${formattedDate}</td>
            <td>${expense.notes || '-'}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary btn-edit-expense me-2" data-id="${expense._id}">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-delete-expense" data-id="${expense._id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    attachHistoryActions();
    filterTable();
}

function getVisibleRows() {
    if (!historyTable) return [];
    return Array.from(historyTable.querySelectorAll('tbody tr'));
}

function filterTable() {
    const searchValue = historySearch ? historySearch.value.trim().toLowerCase() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : '';
    const selectedMonth = monthFilter ? monthFilter.value : '';
    const rows = getVisibleRows();

    rows.forEach(row => {
        const title = row.dataset.title.toLowerCase();
        const category = row.dataset.category.toLowerCase();
        const date = new Date(row.dataset.date);
        const formattedMonth = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
        
        const matchesSearch = title.includes(searchValue);
        const matchesCategory = selectedCategory === '' || category === selectedCategory.toLowerCase();
        const matchesMonth = selectedMonth === '' || formattedMonth === selectedMonth.toLowerCase();
        
        row.style.display = matchesSearch && matchesCategory && matchesMonth ? '' : 'none';
    });
    currentPage = 1;
    updatePagination();
}

function updatePagination() {
    const rows = getVisibleRows().filter(row => row.style.display !== 'none');
    const pageCount = Math.ceil(rows.length / rowsPerPage) || 1;
    rows.forEach((row, index) => {
        const start = (currentPage - 1) * rowsPerPage;
        row.style.display = index >= start && index < start + rowsPerPage ? '' : 'none';
    });
    renderPagination(pageCount);
}

function renderPagination(pageCount) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    const paginationList = document.createElement('ul');
    paginationList.className = 'pagination justify-content-center mb-0';

    for (let i = 1; i <= pageCount; i++) {
        const listItem = document.createElement('li');
        listItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
        const link = document.createElement('a');
        link.className = 'page-link';
        link.href = '#';
        link.textContent = i;
        link.addEventListener('click', function (event) {
            event.preventDefault();
            currentPage = i;
            updatePagination();
        });
        listItem.appendChild(link);
        paginationList.appendChild(listItem);
    }

    paginationContainer.appendChild(paginationList);
}

function attachHistoryActions() {
    const editButtons = document.querySelectorAll('.btn-edit-expense');
    const deleteButtons = document.querySelectorAll('.btn-delete-expense');

    editButtons.forEach(button => {
        button.addEventListener('click', function () {
            alert('Edit expense feature coming soon.');
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', async function () {
            const expenseId = this.dataset.id;
            if (confirm('Are you sure you want to delete this expense?')) {
                try {
                    const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
                            method: 'DELETE',
                            headers: getAuthHeaders()
                        });

                        const data = await response.json();

                        if (data.success) {
                            alert('✅ Expense deleted successfully');
                            loadExpenseHistory();
                        } else {
                            alert('❌ Error: ' + data.message);
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        alert('❌ Failed to delete expense: ' + error.message);
                    }
                }
            });
    });
}

if (historySearch) historySearch.addEventListener('input', filterTable);
if (categoryFilter) categoryFilter.addEventListener('change', filterTable);
if (monthFilter) monthFilter.addEventListener('change', filterTable);

// ==================== DASHBOARD BUDGET ====================
const monthlyBudgetInput = document.getElementById('monthlyBudgetInput');
const saveBudgetBtn = document.getElementById('saveBudgetBtn');
const budgetValueDisplay = document.getElementById('budgetValueDisplay');
const remainingBudgetValue = document.getElementById('remainingBudgetValue');
const monthlyExpenseValue = document.getElementById('monthlyExpenseValue');
const totalExpensesValue = document.getElementById('totalExpensesValue');

async function loadTotalExpenses() {
    try {
        const response = await fetch(`${API_BASE_URL}/expenses`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && totalExpensesValue) {
            const total = data.data.reduce((sum, exp) => sum + (exp.amount || 0), 0);
            totalExpensesValue.textContent = formatCurrency(total);
        }
    } catch (error) {
        console.error('Error loading total expenses:', error);
        if (totalExpensesValue) totalExpensesValue.textContent = formatCurrency(0);
    }
}

async function loadBudget() {
    try {
        const month = getCurrentMonth();
        const response = await fetch(`${API_BASE_URL}/budgets?month=${month}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && data.data && budgetValueDisplay) {
            budgetValueDisplay.textContent = formatCurrency(data.data.budgetAmount);
            if (monthlyBudgetInput) {
                monthlyBudgetInput.value = data.data.budgetAmount;
            }
        } else {
            // No budget set yet, show 0
            if (budgetValueDisplay) budgetValueDisplay.textContent = formatCurrency(0);
            if (monthlyBudgetInput) monthlyBudgetInput.value = '';
        }
        updateRemainingBudget();
    } catch (error) {
        console.error('Error loading budget:', error);
        if (budgetValueDisplay) budgetValueDisplay.textContent = formatCurrency(0);
    }
}

async function loadMonthlyExpenseSummary() {
    try {
        const month = getCurrentMonth();
        const response = await fetch(`${API_BASE_URL}/expenses?month=${month}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && monthlyExpenseValue) {
            const monthlyTotal = data.data.reduce((sum, exp) => sum + (exp.amount || 0), 0);
            monthlyExpenseValue.textContent = formatCurrency(monthlyTotal);
        }
        updateRemainingBudget();
    } catch (error) {
        console.error('Error loading monthly summary:', error);
        if (monthlyExpenseValue) monthlyExpenseValue.textContent = formatCurrency(0);
    }
}

function updateRemainingBudget() {
    if (!budgetValueDisplay || !monthlyExpenseValue || !remainingBudgetValue) return;

    const budget = Number(budgetValueDisplay.textContent.replace(/[₹,]/g, '')) || 0;
    const expense = Number(monthlyExpenseValue.textContent.replace(/[₹,]/g, '')) || 0;
    const remaining = Math.max(budget - expense, 0);

    remainingBudgetValue.textContent = formatCurrency(remaining);

    // Update budget progress bar
    updateBudgetStatus(budget, expense);
}

function updateBudgetStatus(budget, expense) {
    const budgetProgressBar = document.getElementById('budgetProgressBar');
    const budgetStatusText = document.getElementById('budgetStatusText');

    if (!budgetProgressBar || !budgetStatusText) return;

    if (budget === 0) {
        budgetProgressBar.style.width = '0%';
        budgetStatusText.textContent = 'No budget set yet.';
    } else {
        const percentage = Math.min((expense / budget) * 100, 100);
        budgetProgressBar.style.width = percentage + '%';
        budgetStatusText.textContent = `${Math.round(percentage)}% of monthly budget used.`;
    }
}

async function loadTopExpenseAndStats() {
    try {
        const month = getCurrentMonth();
        const response = await fetch(`${API_BASE_URL}/expenses?month=${month}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            // Calculate top category
            const categoryTotals = {};
            let totalAmount = 0;

            data.data.forEach(exp => {
                categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + (exp.amount || 0);
                totalAmount += exp.amount || 0;
            });

            const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
            const topCategoryName = document.getElementById('topCategoryName');
            const topCategoryAmount = document.getElementById('topCategoryAmount');

            if (topCategoryName && topCategoryAmount) {
                topCategoryName.textContent = topCategory[0];
                topCategoryAmount.textContent = `Highest: ${formatCurrency(topCategory[1])} this month`;
            }

            // Update quick stats
            const statsExpensesCount = document.getElementById('statsExpensesCount');
            const statsAvgAmount = document.getElementById('statsAvgAmount');

            if (statsExpensesCount && statsAvgAmount) {
                const avgAmount = totalAmount / data.data.length;
                statsExpensesCount.textContent = `${data.data.length} transaction${data.data.length !== 1 ? 's' : ''}`;
                statsAvgAmount.textContent = formatCurrency(avgAmount);
            }
        } else {
            // No expenses, reset to defaults
            const topCategoryName = document.getElementById('topCategoryName');
            const topCategoryAmount = document.getElementById('topCategoryAmount');
            const statsExpensesCount = document.getElementById('statsExpensesCount');
            const statsAvgAmount = document.getElementById('statsAvgAmount');

            if (topCategoryName) topCategoryName.textContent = '—';
            if (topCategoryAmount) topCategoryAmount.textContent = 'No expenses recorded.';
            if (statsExpensesCount) statsExpensesCount.textContent = '0 transactions';
            if (statsAvgAmount) statsAvgAmount.textContent = formatCurrency(0);
        }
    } catch (error) {
        console.error('Error loading top expense:', error);
    }
}

async function loadHomeMonthlySnapshot() {
    try {
        const month = getCurrentMonth();
        const homeMonthlySpent = document.getElementById('homeMonthlySpent');
        const homeRemaining = document.getElementById('homeRemaining');
        const homeProgressBar = document.getElementById('homeProgressBar');
        const homeProgressText = document.getElementById('homeProgressText');

        if (!homeMonthlySpent || !homeRemaining || !homeProgressBar || !homeProgressText) return;

        // Get monthly expenses
        const expenseResponse = await fetch(`${API_BASE_URL}/expenses?month=${month}`, {
            headers: getAuthHeaders()
        });
        const expenseData = await expenseResponse.json();

        const monthlyExpense = expenseData.success 
            ? expenseData.data.reduce((sum, exp) => sum + (exp.amount || 0), 0) 
            : 0;

        // Get monthly budget
        const budgetResponse = await fetch(`${API_BASE_URL}/budgets?month=${month}`, {
            headers: getAuthHeaders()
        });
        const budgetData = await budgetResponse.json();

        const monthlyBudget = budgetData.success && budgetData.data 
            ? budgetData.data.budgetAmount 
            : 0;

        const remaining = Math.max(monthlyBudget - monthlyExpense, 0);
        const percentage = monthlyBudget > 0 ? (monthlyExpense / monthlyBudget) * 100 : 0;

        homeMonthlySpent.textContent = formatCurrency(monthlyExpense);
        homeRemaining.textContent = formatCurrency(remaining);
        homeProgressBar.style.width = Math.min(percentage, 100) + '%';
        homeProgressText.textContent = `${Math.round(percentage)}% of budget used`;
    } catch (error) {
        console.error('Error loading home snapshot:', error);
    }
}

async function saveMonthlyBudget() {
    if (!monthlyBudgetInput) return;

    const budgetAmount = Number(monthlyBudgetInput.value);

    if (isNaN(budgetAmount) || budgetAmount < 0) {
        alert('❌ Please enter a valid budget amount.');
        return;
    }

    try {
        const month = getCurrentMonth();
        const response = await fetch(`${API_BASE_URL}/budgets`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                month,
                budgetAmount
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ Monthly budget updated successfully!');
            loadBudget();
            updateRemainingBudget();
            loadTopExpenseAndStats();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Failed to save budget: ' + error.message);
    }
}

if (saveBudgetBtn) {
    saveBudgetBtn.addEventListener('click', function (event) {
        event.preventDefault();
        saveMonthlyBudget();
    });
}

// ==================== INITIALIZATION ====================
window.addEventListener('load', async function () {
    // Load history page data
    if (historyTable) {
        await loadExpenseHistory();
    }

    // Load home page snapshot
    if (document.getElementById('homeMonthlySpent')) {
        await loadHomeMonthlySnapshot();
    }

    // Load dashboard data
    if (budgetValueDisplay) {
        await loadTotalExpenses();
        await loadBudget();
        await loadMonthlyExpenseSummary();
        await loadTopExpenseAndStats();
    }

    console.log('✅ Expense Tracker frontend initialized successfully');
});
