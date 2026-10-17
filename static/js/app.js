/**
 * CYBERVAULT 3D - Main Application & Smart Intelligence Core
 * Handles state, Natural Language Processing, AI Copilot, 3D Sync, and Flask REST API.
 */

class CyberVaultApp {
  constructor() {
    this.currencyMap = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥'
    };

    this.selectedCurrency = localStorage.getItem('cybervault_currency') || 'INR';
    this.monthlyBudget = parseFloat(localStorage.getItem('cybervault_budget')) || 65000;
    this.selectedCategoryFilter = null;
    this.typeFilter = 'all';
    this.searchQuery = '';

    // Transactions Store
    this.transactions = this.loadTransactions();

    // 3D Scene Reference
    this.scene3d = null;

    this.init();
  }

  async init() {
    // 1. Initialize 3D Engine
    this.scene3d = new Cyber3DScene('threeCanvasContainer');

    // 2. Setup DOM Event Handlers
    this.setupEventListeners();

    // 3. Render Initial State & Sync
    this.renderAll();

    // 4. Try fetching live data from Flask REST API if available
    await this.fetchFromBackend();

    // Celebration
    if (this.transactions.length > 0 && window.confetti) {
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#00f0ff', '#9d4edd', '#10b981']
        });
      }, 800);
    }
  }

  async fetchFromBackend() {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.transactions = data;
          this.saveTransactions();
          this.renderAll();
        }
      }
      const bRes = await fetch('/api/budget');
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData && bData.budget) {
          this.monthlyBudget = bData.budget;
          localStorage.setItem('cybervault_budget', this.monthlyBudget);
          this.renderAll();
        }
      }
    } catch (e) {
      console.log('Using offline / local storage mode');
    }
  }

  getDefaultTransactions() {
    const today = new Date();
    const formatDate = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offsetDays);
      return d.toISOString().split('T')[0];
    };

    return [
      { id: 'tx-1', type: 'income', amount: 95000, category: 'Salary & Wages', date: formatDate(12), title: 'Core Engineering Salary' },
      { id: 'tx-2', type: 'income', amount: 28000, category: 'Freelance & Side', date: formatDate(5), title: 'Cyber Web3 UI Contract' },
      { id: 'tx-3', type: 'expense', amount: 22000, category: 'Housing & Bills', date: formatDate(10), title: 'Penthouse Apartment Lease' },
      { id: 'tx-4', type: 'expense', amount: 8500, category: 'Food & Dining', date: formatDate(8), title: 'Gourmet Bistro & Team Dinners' },
      { id: 'tx-5', type: 'expense', amount: 14200, category: 'Shopping & Tech', date: formatDate(4), title: '4K UltraWide Monitor' },
      { id: 'tx-6', type: 'expense', amount: 3800, category: 'Transport & Travel', date: formatDate(3), title: 'EV Fast Charging & Uber Black' },
      { id: 'tx-7', type: 'expense', amount: 2400, category: 'Entertainment', date: formatDate(2), title: 'Neural Stream & Steam Games' },
      { id: 'tx-8', type: 'expense', amount: 3100, category: 'Healthcare', date: formatDate(1), title: 'Smart Whey & Crossfit Pass' },
      { id: 'tx-9', type: 'expense', amount: 6200, category: 'Food & Dining', date: formatDate(0), title: 'Organic Supermarket Stock' }
    ];
  }

  loadTransactions() {
    const saved = localStorage.getItem('cybervault_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved transactions', e);
      }
    }
    return this.getDefaultTransactions();
  }

  saveTransactions() {
    localStorage.setItem('cybervault_transactions', JSON.stringify(this.transactions));
  }

  getCurrencySymbol() {
    return this.currencyMap[this.selectedCurrency] || '₹';
  }

  setupEventListeners() {
    // Currency Selector
    const currSelect = document.getElementById('currencySelector');
    if (currSelect) {
      currSelect.value = this.selectedCurrency;
      currSelect.addEventListener('change', (e) => {
        this.selectedCurrency = e.target.value;
        localStorage.setItem('cybervault_currency', this.selectedCurrency);
        this.renderAll();
        if (window.soundFx) window.soundFx.playClick();
      });
    }

    // Audio SFX Toggle
    const soundBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const enabled = window.soundFx.toggle();
        soundIcon.className = enabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
      });
    }

    // AI Natural Language Input Form
    const nlpForm = document.getElementById('nlpForm');
    const nlpInput = document.getElementById('nlpInput');
    if (nlpForm) {
      nlpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = nlpInput.value.trim();
        if (text) {
          this.processNaturalLanguageInput(text);
          nlpInput.value = '';
        }
      });
    }

    // NLP Chip Quick Click
    document.querySelectorAll('.nlp-chips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const ex = chip.getAttribute('data-example');
        if (ex) {
          nlpInput.value = ex;
          this.processNaturalLanguageInput(ex);
          nlpInput.value = '';
        }
      });
    });

    // 3D Camera Mode Buttons
    document.querySelectorAll('.mode-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        document.querySelectorAll('.mode-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        const viewMode = tag.getAttribute('data-view');
        if (this.scene3d) this.scene3d.setCameraPreset(viewMode);
        if (window.soundFx) window.soundFx.playClick();
      });
    });

    // Reset Camera Button
    const resetCamBtn = document.getElementById('resetCamBtn');
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', () => {
        if (this.scene3d) this.scene3d.resetCamera();
        if (window.soundFx) window.soundFx.playClick();
      });
    }

    // Auto Rotate Toggle
    const autoRotateToggle = document.getElementById('autoRotateToggle');
    if (autoRotateToggle) {
      autoRotateToggle.addEventListener('click', () => {
        if (this.scene3d) {
          const isRotating = this.scene3d.toggleAutoRotate();
          autoRotateToggle.classList.toggle('active', isRotating);
        }
        if (window.soundFx) window.soundFx.playClick();
      });
    }

    // Fullscreen 3D Viewport
    const fullscreenBtn = document.getElementById('fullscreen3dBtn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        const vp = document.querySelector('.spatial-viewport');
        if (!document.fullscreenElement) {
          if (vp.requestFullscreen) vp.requestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      });
    }

    // Transaction Modals
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const txModalOverlay = document.getElementById('txModalOverlay');
    const closeTxModalBtn = document.getElementById('closeTxModalBtn');
    const cancelTxBtn = document.getElementById('cancelTxBtn');
    const txForm = document.getElementById('txForm');

    const openModal = () => {
      txForm.reset();
      document.getElementById('txId').value = '';
      document.getElementById('modalTitle').innerText = 'Register Transaction';
      document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('formCurrencyTag').innerText = this.getCurrencySymbol();
      txModalOverlay.classList.remove('hidden');
      if (window.soundFx) window.soundFx.playClick();
    };

    const closeModal = () => {
      txModalOverlay.classList.add('hidden');
    };

    if (openAddModalBtn) openAddModalBtn.addEventListener('click', openModal);
    if (closeTxModalBtn) closeTxModalBtn.addEventListener('click', closeModal);
    if (cancelTxBtn) cancelTxBtn.addEventListener('click', closeModal);

    txModalOverlay.addEventListener('click', (e) => {
      if (e.target === txModalOverlay) closeModal();
    });

    // Handle Form Submit
    if (txForm) {
      txForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = txForm.txType.value;
        const amount = parseFloat(document.getElementById('txAmount').value);
        const date = document.getElementById('txDate').value;
        const category = document.getElementById('txCategory').value;
        const title = document.getElementById('txTitle').value.trim();

        if (isNaN(amount) || amount <= 0) return;

        const newTx = {
          id: 'tx-' + Date.now(),
          type,
          amount,
          date,
          category,
          title
        };

        this.transactions.unshift(newTx);
        this.saveTransactions();
        this.renderAll();
        closeModal();

        // Sync with Backend
        this.syncAddBackend(newTx);

        if (window.soundFx) {
          if (type === 'income') window.soundFx.playSuccess();
          else window.soundFx.playExpense();
        }
      });
    }

    // Budget Target Modal
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    const budgetModalOverlay = document.getElementById('budgetModalOverlay');
    const closeBudgetModalBtn = document.getElementById('closeBudgetModalBtn');
    const cancelBudgetBtn = document.getElementById('cancelBudgetBtn');
    const budgetForm = document.getElementById('budgetForm');
    const budgetInput = document.getElementById('budgetInputModal');

    if (setBudgetBtn) {
      setBudgetBtn.addEventListener('click', () => {
        budgetInput.value = this.monthlyBudget;
        budgetModalOverlay.classList.remove('hidden');
        if (window.soundFx) window.soundFx.playClick();
      });
    }

    const closeBudgetModal = () => budgetModalOverlay.classList.add('hidden');
    if (closeBudgetModalBtn) closeBudgetModalBtn.addEventListener('click', closeBudgetModal);
    if (cancelBudgetBtn) cancelBudgetBtn.addEventListener('click', closeBudgetModal);

    budgetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = parseFloat(budgetInput.value);
      if (val > 0) {
        this.monthlyBudget = val;
        localStorage.setItem('cybervault_budget', this.monthlyBudget);
        this.renderAll();
        closeBudgetModal();
        this.syncBudgetBackend(val);
        if (window.soundFx) window.soundFx.playSuccess();
      }
    });

    // Ledger Filters & Search
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.typeFilter = btn.getAttribute('data-filter');
        this.renderLedger();
        if (window.soundFx) window.soundFx.playClick();
      });
    });

    const searchInput = document.getElementById('searchTxInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderLedger();
      });
    }

    // Clear Category 3D Filter
    const clearCatBtn = document.getElementById('clearCategoryFilter');
    if (clearCatBtn) {
      clearCatBtn.addEventListener('click', () => {
        this.selectedCategoryFilter = null;
        clearCatBtn.classList.add('hidden');
        this.renderLedger();
        this.renderCategoryBreakdown();
        if (window.soundFx) window.soundFx.playClick();
      });
    }

    // Export CSV
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => this.exportToCSV());
    }

    // Export JSON Backup
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => this.exportToJSON());
    }

    // Reset Demo Data
    const resetDataBtn = document.getElementById('resetDataBtn');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('Reset to factory demo transactions?')) {
          this.transactions = this.getDefaultTransactions();
          this.saveTransactions();
          this.renderAll();
          if (window.soundFx) window.soundFx.playAlert();
        }
      });
    }
  }

  processNaturalLanguageInput(inputStr) {
    const raw = inputStr.toLowerCase();
    
    let amount = 0;
    const kMatch = raw.match(/(\d+(?:\.\d+)?)\s*k\b/i);
    if (kMatch) {
      amount = parseFloat(kMatch[1]) * 1000;
    } else {
      const numMatch = raw.match(/(?:(?:rs|inr|usd|\$|€|£|₹)\s*)?(\d+(?:,\d+)*(?:\.\d+)?)/i);
      if (numMatch) {
        amount = parseFloat(numMatch[1].replace(/,/g, ''));
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Could not detect a valid amount. Please include a number, e.g., 'Coffee 250'");
      return;
    }

    let type = 'expense';
    const incomeKeywords = ['salary', 'income', 'received', 'credit', 'credited', 'freelance', 'dividend', 'profit', 'bonus', 'sold', 'inflow'];
    if (incomeKeywords.some(kw => raw.includes(kw))) {
      type = 'income';
    }

    let category = 'Other';
    if (type === 'income') {
      if (raw.includes('salary') || raw.includes('job') || raw.includes('wages')) category = 'Salary & Wages';
      else if (raw.includes('freelance') || raw.includes('client') || raw.includes('project')) category = 'Freelance & Side';
      else if (raw.includes('dividend') || raw.includes('stock') || raw.includes('invest')) category = 'Investment';
      else category = 'Freelance & Side';
    } else {
      if (/food|dinner|lunch|breakfast|swiggy|zomato|pizza|burger|cafe|coffee|starbucks|grocery|groceries|restaurant|snack/i.test(raw)) {
        category = 'Food & Dining';
      } else if (/shopping|cloth|shoes|amazon|flipkart|macbook|laptop|phone|tech|gadget|monitor/i.test(raw)) {
        category = 'Shopping & Tech';
      } else if (/rent|flat|electricity|power|wifi|internet|water|bill|maintenance/i.test(raw)) {
        category = 'Housing & Bills';
      } else if (/uber|ola|taxi|petrol|fuel|diesel|flight|ticket|train|bus|metro|car/i.test(raw)) {
        category = 'Transport & Travel';
      } else if (/game|movie|cinema|netflix|spotify|party|concert|steam/i.test(raw)) {
        category = 'Entertainment';
      } else if (/med|medicine|doctor|hospital|gym|supplement|health|fitness/i.test(raw)) {
        category = 'Healthcare';
      } else if (/sip|stock|crypto|mutual fund|investment/i.test(raw)) {
        category = 'Investment';
      }
    }

    let memo = inputStr.replace(/(?:rs|inr|usd|\$|€|£|₹)?\s*\d+(?:,\d+)*(?:\.\d+)?\s*(?:k\b)?/gi, '')
                      .replace(/\b(spent|paid|for|on|bought|received|got|credited|a|an|the)\b/gi, '')
                      .trim();

    if (!memo) {
      memo = `${category} Entry`;
    } else {
      memo = memo.charAt(0).toUpperCase() + memo.slice(1);
    }

    const newTx = {
      id: 'tx-' + Date.now(),
      type,
      amount,
      date: new Date().toISOString().split('T')[0],
      category,
      title: memo
    };

    this.transactions.unshift(newTx);
    this.saveTransactions();
    this.renderAll();
    this.syncAddBackend(newTx);

    if (window.soundFx) {
      if (type === 'income') window.soundFx.playSuccess();
      else window.soundFx.playExpense();
    }

    if (window.confetti && type === 'income') {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  async syncAddBackend(tx) {
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
    } catch (e) {}
  }

  async syncBudgetBackend(amount) {
    try {
      await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
    } catch (e) {}
  }

  filterByCategory(cat) {
    if (this.selectedCategoryFilter === cat) {
      this.selectedCategoryFilter = null;
    } else {
      this.selectedCategoryFilter = cat;
    }
    
    const clearBtn = document.getElementById('clearCategoryFilter');
    if (clearBtn) {
      if (this.selectedCategoryFilter) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    this.renderCategoryBreakdown();
    this.renderLedger();
  }

  async deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveTransactions();
    this.renderAll();
    if (window.soundFx) window.soundFx.playExpense();

    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    } catch (e) {}
  }

  renderAll() {
    const metrics = this.calculateMetrics();
    this.renderHeaderHealth(metrics.healthScore);
    this.renderMetricsCards(metrics);
    this.renderBudgetProgress(metrics.totalExpense);
    this.renderAiInsights(metrics);
    this.renderCategoryBreakdown();
    this.renderLedger();

    document.querySelectorAll('.current-symbol').forEach(el => {
      el.innerText = this.getCurrencySymbol();
    });
  }

  calculateMetrics() {
    let totalIncome = 0;
    let totalExpense = 0;
    const catMap = {};

    this.transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        if (!catMap[t.category]) {
          catMap[t.category] = { total: 0, count: 0 };
        }
        catMap[t.category].total += t.amount;
        catMap[t.category].count += 1;
      }
    });

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100) : 0;

    let budgetScore = 100;
    if (this.monthlyBudget > 0) {
      const budgetUsedRatio = totalExpense / this.monthlyBudget;
      if (budgetUsedRatio <= 0.7) budgetScore = 100;
      else if (budgetUsedRatio <= 1.0) budgetScore = 100 - (budgetUsedRatio - 0.7) * 200;
      else budgetScore = Math.max(10, 40 - (budgetUsedRatio - 1.0) * 80);
    }

    let savingsScore = 50;
    if (totalIncome > 0) {
      if (savingsRate >= 30) savingsScore = 100;
      else if (savingsRate > 0) savingsScore = 50 + (savingsRate / 30) * 50;
      else savingsScore = Math.max(10, 50 + savingsRate);
    }

    const healthScore = Math.round(budgetScore * 0.5 + savingsScore * 0.5);

    return {
      totalIncome,
      totalExpense,
      netBalance,
      savingsRate,
      healthScore,
      catMap
    };
  }

  renderHeaderHealth(score) {
    const bar = document.getElementById('headerHealthBar');
    const val = document.getElementById('headerHealthVal');
    if (bar) bar.style.width = `${score}%`;
    if (val) val.innerText = `${score}%`;

    if (this.scene3d) {
      this.scene3d.updateHealthVisuals(score);
    }
  }

  renderMetricsCards(metrics) {
    const sym = this.getCurrencySymbol();
    
    const balEl = document.getElementById('totalBalanceDisplay');
    if (balEl) balEl.innerText = `${sym}${metrics.netBalance.toLocaleString()}`;

    const dailyBurn = metrics.totalExpense / 30;
    const runwayMos = dailyBurn > 0 ? (metrics.netBalance / (dailyBurn * 30)).toFixed(1) : '∞';
    const runwayEl = document.getElementById('runwayDisplay');
    if (runwayEl) runwayEl.innerText = runwayMos > 0 ? `~${runwayMos} mos` : 'Action Required';

    const incEl = document.getElementById('totalIncomeDisplay');
    if (incEl) incEl.innerText = `+${sym}${metrics.totalIncome.toLocaleString()}`;
    const incCount = document.getElementById('incomeCount');
    const incTxNum = this.transactions.filter(t => t.type === 'income').length;
    if (incCount) incCount.innerText = `${incTxNum} inflows logged`;

    const expEl = document.getElementById('totalExpenseDisplay');
    if (expEl) expEl.innerText = `-${sym}${metrics.totalExpense.toLocaleString()}`;
    const burnEl = document.getElementById('burnRateDisplay');
    if (burnEl) burnEl.innerText = `Burn: ${sym}${Math.round(dailyBurn).toLocaleString()}/day`;
  }

  renderBudgetProgress(totalExpense) {
    const sym = this.getCurrencySymbol();
    const spentEl = document.getElementById('budgetSpent');
    const limitEl = document.getElementById('budgetLimit');
    const fillEl = document.getElementById('budgetProgressFill');
    const badgeEl = document.getElementById('budgetStatusBadge');
    const remEl = document.getElementById('budgetRemaining');

    if (spentEl) spentEl.innerText = `Spent: ${sym}${totalExpense.toLocaleString()}`;
    if (limitEl) limitEl.innerText = `Target: ${sym}${this.monthlyBudget.toLocaleString()}`;

    const percent = this.monthlyBudget > 0 ? Math.min(100, (totalExpense / this.monthlyBudget) * 100) : 0;
    if (fillEl) {
      fillEl.style.width = `${percent}%`;
      fillEl.className = 'cyber-progress-fill';
      if (percent > 90) fillEl.classList.add('danger');
      else if (percent > 70) fillEl.classList.add('warning');
    }

    const remaining = this.monthlyBudget - totalExpense;
    if (remEl) {
      remEl.innerText = remaining >= 0 ? `${sym}${remaining.toLocaleString()} left` : `${sym}${Math.abs(remaining).toLocaleString()} over`;
    }

    if (badgeEl) {
      badgeEl.className = 'status-badge';
      if (percent < 70) {
        badgeEl.classList.add('safe');
        badgeEl.innerText = 'Optimal Level';
      } else if (percent <= 100) {
        badgeEl.classList.add('warn');
        badgeEl.innerText = 'High Burn';
      } else {
        badgeEl.classList.add('danger');
        badgeEl.innerText = 'Exceeded';
      }
    }
  }

  renderAiInsights(metrics) {
    const container = document.getElementById('insightsContainer');
    if (!container) return;

    const insights = [];
    const sym = this.getCurrencySymbol();

    if (metrics.savingsRate >= 35) {
      insights.push({
        type: 'safe',
        icon: 'fa-shield-halved',
        text: `<strong>Alpha Wealth State:</strong> Exceptional ${metrics.savingsRate.toFixed(1)}% savings retention rate. Consider re-allocating excess capital into high-yield investments.`
      });
    } else if (metrics.savingsRate >= 10) {
      insights.push({
        type: 'info',
        icon: 'fa-chart-line',
        text: `<strong>Stable Operations:</strong> Retaining ${metrics.savingsRate.toFixed(1)}% net revenue. Target 30% retention to boost liquid financial security.`
      });
    } else {
      insights.push({
        type: 'danger',
        icon: 'fa-triangle-exclamation',
        text: `<strong>Burn Alert:</strong> Outflows are exceeding safe velocity (${metrics.savingsRate.toFixed(1)}% margin). Review non-essential subscriptions and luxury expenses.`
      });
    }

    let topCat = null;
    let maxSpend = 0;
    Object.keys(metrics.catMap).forEach(cat => {
      if (metrics.catMap[cat].total > maxSpend) {
        maxSpend = metrics.catMap[cat].total;
        topCat = cat;
      }
    });

    if (topCat && metrics.totalExpense > 0) {
      const topCatRatio = Math.round((maxSpend / metrics.totalExpense) * 100);
      if (topCatRatio > 35) {
        insights.push({
          type: 'alert',
          icon: 'fa-fire-flame-curved',
          text: `<strong>High Concentration:</strong> <em>${topCat}</em> absorbs <strong>${topCatRatio}%</strong> of total outflows (${sym}${maxSpend.toLocaleString()}).`
        });
      }
    }

    const dailyBurn = metrics.totalExpense / 30;
    if (metrics.netBalance > 0 && dailyBurn > 0) {
      const runwayMonths = (metrics.netBalance / (dailyBurn * 30)).toFixed(1);
      insights.push({
        type: 'info',
        icon: 'fa-satellite-dish',
        text: `<strong>Runway Horizon:</strong> Liquid reserves sustain ~<strong>${runwayMonths} months</strong> of baseline operational velocity without incoming revenue.`
      });
    }

    container.innerHTML = insights.map(item => `
      <div class="insight-card ${item.type}">
        <i class="fa-solid ${item.icon}"></i>
        <div>${item.text}</div>
      </div>
    `).join('');
  }

  renderCategoryBreakdown() {
    const list = document.getElementById('categoryBarsList');
    if (!list) return;

    const metrics = this.calculateMetrics();
    const catMap = metrics.catMap;
    const totalExpense = metrics.totalExpense;
    const sym = this.getCurrencySymbol();

    if (this.scene3d) {
      this.scene3d.updateCategoryPillars(catMap, totalExpense);
    }

    const categories = Object.keys(catMap).sort((a, b) => catMap[b].total - catMap[a].total);

    if (categories.length === 0) {
      list.innerHTML = `<div class="empty-state">No outflows recorded yet.</div>`;
      return;
    }

    list.innerHTML = categories.map(cat => {
      const data = catMap[cat];
      const percent = totalExpense > 0 ? Math.round((data.total / totalExpense) * 100) : 0;
      const colorHex = '#' + (this.scene3d.categoryColors[cat] || 0x00f0ff).toString(16).padStart(6, '0');
      const isSelected = this.selectedCategoryFilter === cat;

      return `
        <div class="category-row ${isSelected ? 'active' : ''}" onclick="window.app.filterByCategory('${cat}')">
          <div class="cat-info-line">
            <span class="cat-name-tag">
              <span class="cat-color-dot" style="background: ${colorHex}; box-shadow: 0 0 8px ${colorHex};"></span>
              ${cat}
            </span>
            <span class="cat-amount">${sym}${data.total.toLocaleString()} (${percent}%)</span>
          </div>
          <div class="cat-bar-bg">
            <div class="cat-bar-val" style="width: ${percent}%; background: ${colorHex}; box-shadow: 0 0 10px ${colorHex};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderLedger() {
    const list = document.getElementById('transactionList');
    if (!list) return;

    const sym = this.getCurrencySymbol();

    let filtered = this.transactions.filter(t => {
      if (this.typeFilter !== 'all' && t.type !== this.typeFilter) return false;
      if (this.selectedCategoryFilter && t.category !== this.selectedCategoryFilter) return false;
      if (this.searchQuery) {
        const query = this.searchQuery;
        const matchesTitle = (t.title || '').toLowerCase().includes(query);
        const matchesCat = (t.category || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesCat) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state">No transactions match the selected criteria.</div>`;
      return;
    }

    const catIconMap = {
      'Food & Dining': '🍽️',
      'Shopping & Tech': '🛍️',
      'Housing & Bills': '🏠',
      'Transport & Travel': '🚗',
      'Entertainment': '🎮',
      'Healthcare': '💊',
      'Investment': '📈',
      'Salary & Wages': '💼',
      'Freelance & Side': '🚀',
      'Other': '✨'
    };

    list.innerHTML = filtered.map(t => {
      const isExpense = t.type === 'expense';
      const sign = isExpense ? '-' : '+';
      const amountColor = isExpense ? 'text-danger' : 'text-success';
      const icon = catIconMap[t.category] || '💰';

      return `
        <div class="tx-item" id="${t.id}">
          <div class="tx-info-left">
            <div class="tx-cat-icon">${icon}</div>
            <div>
              <div class="tx-title" title="${t.title}">${t.title}</div>
              <div class="tx-date-category">${t.category} &bull; ${t.date}</div>
            </div>
          </div>
          <div class="tx-info-right">
            <div class="tx-amount ${amountColor}">${sign}${sym}${t.amount.toLocaleString()}</div>
            <button class="tx-delete-btn" onclick="window.app.deleteTransaction('${t.id}')" title="Delete">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  exportToCSV() {
    if (this.transactions.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ["ID", "Type", "Title", "Category", "Amount", "Date"];
    const rows = this.transactions.map(t => [
      t.id,
      t.type,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.amount,
      t.date
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cybervault_financial_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.soundFx) window.soundFx.playSuccess();
  }

  exportToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.transactions, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `cybervault_backup_${Date.now()}.json`);
    dlAnchorElem.click();

    if (window.soundFx) window.soundFx.playSuccess();
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CyberVaultApp();
});
