let totalIncome = 0;
let totalExpenses = 0;
let monthlyBudget = 0;
let budgetStartDate = null;
let transactions = [];

// DOM refs
const incomeTotal     = document.getElementById("incomeTotal");
const expenseTotal    = document.getElementById("expenseTotal");
const balanceTotal    = document.getElementById("balanceTotal");
const budgetInput     = document.getElementById("budgetInput");
const budgetDateInput = document.getElementById("budgetDate");
const setBudgetBtn    = document.getElementById("setBudgetBtn");
const budgetDisplay   = document.getElementById("budgetDisplay");
const budgetDateDisplay = document.getElementById("budgetDateDisplay");
const remainingBudget = document.getElementById("remainingBudget");
const addIncomeBtn    = document.getElementById("addIncomeBtn");
const addExpenseBtn   = document.getElementById("addExpenseBtn");
const incomeAmount    = document.getElementById("incomeAmount");
const expenseAmount   = document.getElementById("expenseAmount");

// Date Inputs
const incomeDate      = document.getElementById("incomeDate");
const expenseDate     = document.getElementById("expenseDate");

const transactionList = document.getElementById("transactionList");
const emptyState      = document.getElementById("emptyState");
const themeToggle     = document.getElementById("themeToggle");

// AI Chat Elements
const aiChatHistory   = document.getElementById("aiChatHistory");
const aiQuestionInput = document.getElementById("aiQuestionInput");
const askAiBtn        = document.getElementById("askAiBtn");

// Format currency
const fmt = (n) => `Ksh ${Number(n).toLocaleString()}`;

// Format Date for display (e.g., "Oct 24")
const fmtDate = (timestamp) => {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Format Full Date (e.g., "Oct 24, 2023")
const fmtDateFull = (dateString) => {
    if(!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// --- CHART 1: EXPENSE BREAKDOWN ---
const palette = [
  "#b08542", "#8a6228", "#4a6b3a", "#8c2f2f", "#5b4a39",
  "#c9a86a", "#6e8c5a", "#b85a3c", "#7a6240", "#3f5d6b",
  "#a07a5c", "#9a8a6a"
];

const ctx1 = document.getElementById("expenseChart");
const expenseChart = new Chart(ctx1, {
  type: "doughnut",
  data: { labels: [], datasets: [{ data: [], backgroundColor: palette, borderColor: "#fbf6ec", borderWidth: 2 }] },
  options: {
    plugins: {
      legend: {
        position: "bottom",
        labels: { font: { family: "Inter", size: 12 }, color: "#5b4a39", padding: 14 }
      }
    },
    cutout: "62%"
  }
});

// --- CHART 2: MONTHLY HISTORY & TRENDS ---
const ctx2 = document.getElementById("historyChart");
const historyChart = new Chart(ctx2, {
  type: "bar",
  data: {
    labels: [],
    datasets: [{
      label: "Monthly Spending",
      data: [],
      backgroundColor: "#b08542",
      borderRadius: 2
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { family: "Inter" }, color: "#5b4a39" }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: "Inter" }, color: "#5b4a39" }
      }
    },
    plugins: {
      legend: { display: false }
    }
  }
});

// Init
loadTheme();
loadTransactions();

const savedBudget = localStorage.getItem("monthlyBudget");
if (savedBudget) { monthlyBudget = Number(savedBudget); }

const savedBudgetDate = localStorage.getItem("budgetStartDate");
if (savedBudgetDate) { budgetStartDate = savedBudgetDate; }

updateBudgetDisplay();

// Set default date inputs to today
const today = new Date().toISOString().split('T')[0];
if(incomeDate) incomeDate.value = today;
if(expenseDate) expenseDate.value = today;

// Set budget
setBudgetBtn.addEventListener("click", () => {
  const v = Number(budgetInput.value);
  const d = budgetDateInput.value;
  if (!v) return;
  
  monthlyBudget = v;
  localStorage.setItem("monthlyBudget", monthlyBudget);
  
  if(d) {
      budgetStartDate = d;
      localStorage.setItem("budgetStartDate", d);
  }
  
  updateBudgetDisplay();
  budgetInput.value = "";
});

// Add income
addIncomeBtn.addEventListener("click", () => {
  const amount = Number(incomeAmount.value);
  if (!amount) return;
  
  const dateVal = incomeDate && incomeDate.value ? new Date(incomeDate.value).getTime() : Date.now();
  
  transactions.push({ type: "income", amount, date: dateVal });
  persist();
  incomeAmount.value = "";
});

// Add expense
addExpenseBtn.addEventListener("click", () => {
  const amount = Number(expenseAmount.value);
  const category = document.getElementById("expenseCategory").value;
  if (!amount) return;

  const dateVal = expenseDate && expenseDate.value ? new Date(expenseDate.value).getTime() : Date.now();

  transactions.push({ type: "expense", amount, category, date: dateVal });
  persist();
  expenseAmount.value = "";
});

// Ask AI Button Listener
askAiBtn.addEventListener("click", handleAIQuestion);
aiQuestionInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleAIQuestion();
});

function persist() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
  recalc();
  render();
}

function recalc() {
  totalIncome = 0; totalExpenses = 0;
  transactions.forEach(t => {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpenses += t.amount;
  });
}

function render() {
  transactionList.innerHTML = "";
  emptyState.classList.toggle("show", transactions.length === 0);

  [...transactions].reverse().forEach((t, revIdx) => {
    const realIdx = transactions.length - 1 - revIdx;
    const li = document.createElement("li");
    const isIncome = t.type === "income";
    const meta = isIncome ? "Income" : (t.category || "Expense");
    const dateStr = fmtDate(t.date);

    li.innerHTML = `
      <div class="entry-text">
        <span class="marker" style="color:${isIncome ? 'var(--green)' : 'var(--red)'}">
          ${isIncome ? '+' : '−'}
        </span>
        <div>
          <div>${fmt(t.amount)}</div>
          <div class="meta">${meta} • ${dateStr}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:14px;">
        <span class="entry-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '−'} ${fmt(t.amount)}
        </span>
        <button class="delete-btn" aria-label="Delete">✕</button>
      </div>
    `;
    
    li.querySelector(".delete-btn").addEventListener("click", () => {
      transactions.splice(realIdx, 1);
      
      if (transactions.length === 0) {
        monthlyBudget = 0;
        budgetStartDate = null;
        localStorage.setItem("monthlyBudget", 0);
        localStorage.removeItem("budgetStartDate");
      }
      
      persist();
    });
    transactionList.appendChild(li);
  });

  incomeTotal.textContent  = fmt(totalIncome);
  expenseTotal.textContent = fmt(totalExpenses);
  balanceTotal.textContent = fmt(totalIncome - totalExpenses);
  updateBudgetDisplay();

  const byCat = {};
  transactions.filter(t => t.type === "expense")
    .forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  expenseChart.data.labels = Object.keys(byCat);
  expenseChart.data.datasets[0].data = Object.values(byCat);
  expenseChart.update();

  updateHistoryChart();
}

function updateBudgetDisplay() {
  budgetDisplay.textContent  = fmt(monthlyBudget);
  
  if(budgetStartDate) {
      budgetDateDisplay.textContent = `Since: ${fmtDateFull(budgetStartDate)}`;
  } else {
      budgetDateDisplay.textContent = monthlyBudget > 0 ? "Date not set" : "Not set";
  }

  const remaining = monthlyBudget - totalExpenses;
  remainingBudget.textContent = fmt(remaining);
  remainingBudget.style.color = remaining < 0 ? "var(--red)" : "var(--gold-deep)";
}

function loadTransactions() {
  const saved = localStorage.getItem("transactions");
  if (saved) {
    transactions = JSON.parse(saved);
    recalc();
  }
  render();
}

function updateHistoryChart() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const monthlyData = new Array(12).fill(0);

  transactions.forEach(t => {
    if (t.type === "expense") {
      const date = new Date(t.date);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        monthlyData[monthIndex] += t.amount;
      }
    }
  });

  historyChart.data.labels = months;
  historyChart.data.datasets[0].data = monthlyData;
  historyChart.update();
}

// --- BASIC AI LOGIC ---

function handleAIQuestion() {
  const question = aiQuestionInput.value.trim().toLowerCase();
  if (!question) return;

  // 1. Add User Message to Chat
  addMessageToChat(aiQuestionInput.value, 'user');
  aiQuestionInput.value = "";

  // 2. Generate Response Logic
  let response = "";
  
  // Simple keyword matching logic
  if (question.includes("budget") || question.includes("limit")) {
    const remaining = monthlyBudget - totalExpenses;
    if (monthlyBudget === 0) response = "You haven't set a monthly budget yet.";
    else if (remaining < 0) response = `You are over budget by ${fmt(Math.abs(remaining))}.`;
    else response = `You have ${fmt(remaining)} remaining of your ${fmt(monthlyBudget)} budget.`;
  } 
  else if (question.includes("spent") || question.includes("expense") || question.includes("cost")) {
    response = `You have spent a total of ${fmt(totalExpenses)} this record.`;
  }
  else if (question.includes("income") || question.includes("earn")) {
    response = `Your total recorded income is ${fmt(totalIncome)}.`;
  }
  else if (question.includes("trend") || question.includes("compare") || question.includes("month")) {
    const now = new Date();
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    
    const thisMonthExpenses = transactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
      .reduce((sum, t) => sum + t.amount, 0);
      
    const lastMonthExpenses = transactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === lastMonthDate.getMonth() && new Date(t.date).getFullYear() === lastMonthDate.getFullYear())
      .reduce((sum, t) => sum + t.amount, 0);

    if (lastMonthExpenses > 0 && thisMonthExpenses > 0) {
      const diff = thisMonthExpenses - lastMonthExpenses;
      const percentChange = ((diff / lastMonthExpenses) * 100).toFixed(1);
      if (diff > 0) response = `Spending is up ${percentChange}% compared to last month.`;
      else response = `Great news! Spending is down ${Math.abs(percentChange)}% compared to last month.`;
    } else {
      response = "I need more data from previous months to compare trends.";
    }
  }
  else if (question.includes("high") || question.includes("most") || question.includes("category")) {
    const byCat = {};
    transactions.filter(t => t.type === "expense").forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const categories = Object.keys(byCat);
    if (categories.length > 0) {
      const maxCat = categories.reduce((a, b) => byCat[a] > byCat[b] ? a : b);
      response = `Your highest spending category is <em>${maxCat}</em> (${fmt(byCat[maxCat])}).`;
    } else {
      response = "No expenses recorded yet.";
    }
  }
  else {
    response = "I'm tracking your budget. You can ask me about your budget, spending trends, or highest expense category.";
  }

  // 3. Add AI Response after a short delay
  setTimeout(() => {
    addMessageToChat(response, 'ai');
  }, 500);
}

function addMessageToChat(text, sender) {
  const div = document.createElement("div");
  div.className = sender === 'user' ? 'message user-message' : 'message ai-message';
  div.innerHTML = text;
  aiChatHistory.appendChild(div);
  // Auto scroll to bottom
  aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}

// Theme
function loadTheme() {
  if (localStorage.getItem("theme") === "dark") {
      document.body.classList.add("dark-mode");
      updateChartsTheme(true);
  }
}

function updateChartsTheme(isDark) {
    const textColor = isDark ? "#efe3cc" : "#5b4a39";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

    [expenseChart, historyChart].forEach(chart => {
        if(chart.options.scales.x.ticks) {
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.y.grid.color = gridColor;
        }
        if(chart.options.plugins.legend.labels) {
            chart.options.plugins.legend.labels.color = textColor;
        }
        if(chart.type === 'doughnut') {
            chart.data.datasets[0].borderColor = isDark ? "#1f1a13" : "#fbf6ec";
        }
        chart.update();
    });
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateChartsTheme(isDark);
});