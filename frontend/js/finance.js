// Finance Tools JavaScript

// Tab Switching
document.querySelectorAll('.tool-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tool = tab.dataset.tool;
    
    // Update tabs
    document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Update panels
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`${tool}-panel`).classList.add('active');
  });
});

// ============= TIP CALCULATOR =============
function setTip(percent) {
  document.getElementById('tip-percent').value = percent;
}

function calculateTip() {
  const bill = parseFloat(document.getElementById('tip-bill').value) || 0;
  const percent = parseFloat(document.getElementById('tip-percent').value) || 0;
  const people = parseInt(document.getElementById('tip-people').value) || 1;
  
  if (bill <= 0) {
    alert('Please enter a valid bill amount');
    return;
  }
  
  const tipAmount = bill * (percent / 100);
  const total = bill + tipAmount;
  const perPerson = total / people;
  const tipPerPerson = tipAmount / people;
  
  const resultBox = document.getElementById('tip-result');
  resultBox.innerHTML = `
    <h4>💵 Tip Breakdown</h4>
    <div class="result-item">
      <span class="result-label">Bill Amount:</span>
      <span class="result-value">$${bill.toFixed(2)}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Tip (${percent}%):</span>
      <span class="result-value">$${tipAmount.toFixed(2)}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Total:</span>
      <span class="result-value">$${total.toFixed(2)}</span>
    </div>
    ${people > 1 ? `
    <div class="result-item">
      <span class="result-label">Per Person:</span>
      <span class="result-value">$${perPerson.toFixed(2)}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Tip Per Person:</span>
      <span class="result-value">$${tipPerPerson.toFixed(2)}</span>
    </div>
    ` : ''}
  `;
  resultBox.classList.add('show');
}

// ============= LOAN CALCULATOR =============
function calculateLoan() {
  const principal = parseFloat(document.getElementById('loan-amount').value) || 0;
  const annualRate = parseFloat(document.getElementById('loan-rate').value) || 0;
  const years = parseInt(document.getElementById('loan-years').value) || 0;
  
  if (principal <= 0 || annualRate <= 0 || years <= 0) {
    alert('Please enter valid loan details');
    return;
  }
  
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  // Monthly payment formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                         (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  const totalPaid = monthlyPayment * numPayments;
  const totalInterest = totalPaid - principal;
  
  const resultBox = document.getElementById('loan-result');
  resultBox.innerHTML = `
    <h4>🏦 Loan Summary</h4>
    <div class="result-item">
      <span class="result-label">Loan Amount:</span>
      <span class="result-value">$${principal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Interest Rate:</span>
      <span class="result-value">${annualRate}% APR</span>
    </div>
    <div class="result-item">
      <span class="result-label">Loan Term:</span>
      <span class="result-value">${years} years (${numPayments} months)</span>
    </div>
    <div class="result-item">
      <span class="result-label">Monthly Payment:</span>
      <span class="result-value">$${monthlyPayment.toFixed(2)}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Total Interest:</span>
      <span class="result-value">$${totalInterest.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Total Amount Paid:</span>
      <span class="result-value">$${totalPaid.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
  `;
  resultBox.classList.add('show');
}

// ============= CURRENCY CONVERTER =============
async function convertCurrency() {
  const amount = parseFloat(document.getElementById('currency-amount').value) || 0;
  const from = document.getElementById('currency-from').value;
  const to = document.getElementById('currency-to').value;
  
  if (amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  const resultBox = document.getElementById('currency-result');
  resultBox.innerHTML = '<p style="text-align: center;">⏳ Fetching live rates...</p>';
  resultBox.classList.add('show');
  
  try {
    // Using exchangerate-api.com free tier
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const data = await response.json();
    
    if (!data.rates || !data.rates[to]) {
      throw new Error('Currency not found');
    }
    
    const rate = data.rates[to];
    const converted = amount * rate;
    const lastUpdated = new Date(data.time_last_updated * 1000).toLocaleString();
    
    resultBox.innerHTML = `
      <h4>💱 Conversion Result</h4>
      <div class="result-item">
        <span class="result-label">From:</span>
        <span class="result-value">${amount.toFixed(2)} ${from}</span>
      </div>
      <div class="result-item">
        <span class="result-label">Exchange Rate:</span>
        <span class="result-value">1 ${from} = ${rate.toFixed(4)} ${to}</span>
      </div>
      <div class="result-item">
        <span class="result-label">Converted Amount:</span>
        <span class="result-value">${converted.toFixed(2)} ${to}</span>
      </div>
      <p style="margin-top: 15px; font-size: 12px; color: rgba(255,255,255,0.6); text-align: center;">
        Last updated: ${lastUpdated}
      </p>
    `;
  } catch (error) {
    resultBox.innerHTML = `
      <p style="color: #f56565; text-align: center;">
        ❌ Error fetching exchange rates. Please try again later.
      </p>
    `;
  }
}

// ============= BUDGET TRACKER =============
let budgetData = {
  income: 0,
  expenses: []
};

// Load budget from localStorage
function loadBudget() {
  const saved = localStorage.getItem('budget_data');
  if (saved) {
    budgetData = JSON.parse(saved);
    updateBudgetDisplay();
  }
}

// Save budget to localStorage
function saveBudget() {
  localStorage.setItem('budget_data', JSON.stringify(budgetData));
}

function setIncome() {
  const income = parseFloat(document.getElementById('monthly-income').value) || 0;
  
  if (income <= 0) {
    alert('Please enter a valid income amount');
    return;
  }
  
  budgetData.income = income;
  saveBudget();
  updateBudgetDisplay();
  document.getElementById('monthly-income').value = '';
}

function addExpense() {
  const name = document.getElementById('expense-name').value.trim();
  const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
  const category = document.getElementById('expense-category').value;
  
  if (!name || amount <= 0) {
    alert('Please enter valid expense details');
    return;
  }
  
  budgetData.expenses.push({
    id: Date.now(),
    name,
    amount,
    category
  });
  
  saveBudget();
  updateBudgetDisplay();
  
  // Clear inputs
  document.getElementById('expense-name').value = '';
  document.getElementById('expense-amount').value = '';
}

function deleteExpense(id) {
  budgetData.expenses = budgetData.expenses.filter(e => e.id !== id);
  saveBudget();
  updateBudgetDisplay();
}

function updateBudgetDisplay() {
  const totalExpenses = budgetData.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budgetData.income - totalExpenses;
  
  // Update summary
  document.getElementById('total-income').textContent = `$${budgetData.income.toFixed(2)}`;
  document.getElementById('total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
  
  const remainingEl = document.getElementById('remaining');
  remainingEl.textContent = `$${remaining.toFixed(2)}`;
  remainingEl.style.color = remaining >= 0 ? '#48bb78' : '#f56565';
  
  // Update expenses list
  const expensesList = document.getElementById('expenses-list');
  if (budgetData.expenses.length === 0) {
    expensesList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">No expenses added yet</p>';
  } else {
    expensesList.innerHTML = budgetData.expenses.map(expense => `
      <div class="expense-item">
        <div class="expense-info">
          <div class="expense-name">${expense.name}</div>
          <div class="expense-category">${expense.category}</div>
        </div>
        <span class="expense-amount">$${expense.amount.toFixed(2)}</span>
        <button class="expense-delete" onclick="deleteExpense(${expense.id})">Delete</button>
      </div>
    `).join('');
  }
}

// ============= COMPOUND INTEREST CALCULATOR =============
function calculateCompound() {
  const principal = parseFloat(document.getElementById('compound-principal').value) || 0;
  const monthly = parseFloat(document.getElementById('compound-monthly').value) || 0;
  const annualRate = parseFloat(document.getElementById('compound-rate').value) || 0;
  const years = parseInt(document.getElementById('compound-years').value) || 0;
  const frequency = parseInt(document.getElementById('compound-frequency').value) || 12;
  
  if (principal <= 0 || years <= 0) {
    alert('Please enter valid investment details');
    return;
  }
  
  const rate = annualRate / 100;
  const n = frequency;
  const t = years;
  
  // Compound interest with regular contributions
  // FV = P(1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) - 1) / (r/n)]
  const compoundFactor = Math.pow(1 + rate / n, n * t);
  const principalGrowth = principal * compoundFactor;
  
  let contributionGrowth = 0;
  if (monthly > 0) {
    // Monthly contributions compounded
    const monthlyRate = rate / 12;
    const months = years * 12;
    contributionGrowth = monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }
  
  const futureValue = principalGrowth + contributionGrowth;
  const totalContributions = principal + (monthly * 12 * years);
  const totalInterest = futureValue - totalContributions;
  
  const resultBox = document.getElementById('compound-result');
  resultBox.innerHTML = `
    <h4>📈 Investment Growth</h4>
    <div class="result-item">
      <span class="result-label">Initial Investment:</span>
      <span class="result-value">$${principal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Total Contributions:</span>
      <span class="result-value">$${(monthly * 12 * years).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Total Invested:</span>
      <span class="result-value">$${totalContributions.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Interest Earned:</span>
      <span class="result-value" style="color: #48bb78;">$${totalInterest.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Future Value:</span>
      <span class="result-value">$${futureValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
    <p style="margin-top: 15px; font-size: 13px; color: rgba(255,255,255,0.7); text-align: center;">
      💡 Your money will grow ${((futureValue / totalContributions - 1) * 100).toFixed(1)}% over ${years} years!
    </p>
  `;
  resultBox.classList.add('show');
}

// Initialize budget tracker on page load
loadBudget();
