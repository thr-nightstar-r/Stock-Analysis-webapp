const CONFIG = {
    GEMINI_API_KEY: 'AIzaSyChvstP-mGvGCLs8iYl1xl6srP66l_DxK4',
    FINNHUB_API_KEY: 'd25kukhr01qns40ff820d25kukhr01qns40ff82g',
    POPULAR_STOCKS: [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corp.' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.' },
        { symbol: 'TSLA', name: 'Tesla Inc.' },
        { symbol: 'NVDA', name: 'NVIDIA Corp.' },
        { symbol: 'META', name: 'Meta Platforms Inc.' },
        { symbol: 'NFLX', name: 'Netflix Inc.' }
    ],
    CHART_COLORS: {
        primary: '#2563eb',
        success: '#10b981',
        danger: '#ef4444',
        background: 'rgba(37, 99, 235, 0.1)',
        grid: '#e2e8f0'
    },
    REFRESH_INTERVAL: 30000,
    MAX_RETRIES: 3
};

const elements = {
    stockForm: null,
    stockSymbolInput: null,
    statusSection: null,
    resultsDiv: null,
    stockNameEl: null,
    stockInfoEl: null,
    aiSuggestionEl: null,
    chartCanvas: null,
    liveScreenerContainer: null,
    currentTimeEl: null,
    darkModeToggle: null
};

let stockChart = null;
let chartUpdateInterval = null;
let lastSymbol = null;
let currentTimeframe = '3M';
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let isSearching = false;

document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    initializeApp();
});

function initializeElements() {
    elements.stockForm = document.getElementById('stockForm');
    elements.stockSymbolInput = document.getElementById('stockSymbol');
    elements.statusSection = document.getElementById('statusSection');
    elements.resultsDiv = document.getElementById('results');
    elements.stockNameEl = document.getElementById('stockName');
    elements.stockInfoEl = document.getElementById('stockInfo');
    elements.aiSuggestionEl = document.getElementById('aiSuggestion');
    elements.chartCanvas = document.getElementById('stockChart');
    elements.liveScreenerContainer = document.getElementById('liveScreener');
    elements.currentTimeEl = document.getElementById('currentTime');
    elements.darkModeToggle = document.getElementById('darkModeToggle');
}

function initializeApp() {
    if (!elements.stockForm || !elements.stockSymbolInput) {
        console.error('Required elements not found');
        return;
    }

    testChartFunctionality();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    loadLiveScreener();
    setupEventListeners();
    setupDarkMode();
    
    setTimeout(() => {
        elements.stockSymbolInput.focus();
    }, 500);
}

function setupEventListeners() {
    elements.stockForm.addEventListener('submit', handleStockSearch);
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            elements.stockSymbolInput.focus();
        }
        if (e.key === 'Escape') {
            clearStatus();
        }
    });
    
    if (elements.darkModeToggle) {
        elements.darkModeToggle.addEventListener('click', toggleDarkMode);
    }
    
    elements.stockSymbolInput.addEventListener('input', debounce(handleSearchInput, 300));
    elements.stockSymbolInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isSearching) {
            handleStockSearch(e);
        }
    });
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add loading animations to cards
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.live-stock-card, .feature-card, .step-card').forEach(card => {
        observer.observe(card);
    });
}

function setupDarkMode() {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        if (elements.darkModeToggle) {
            elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            elements.darkModeToggle.classList.add('pulse');
            setTimeout(() => elements.darkModeToggle.classList.remove('pulse'), 1000);
        }
    } else {
        document.body.classList.remove('dark-mode');
        if (elements.darkModeToggle) {
            elements.darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            elements.darkModeToggle.classList.add('pulse');
            setTimeout(() => elements.darkModeToggle.classList.remove('pulse'), 1000);
        }
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    setupDarkMode();
    
    if (stockChart) {
        updateChartTheme();
    }
}

async function handleStockSearch(e) {
    e.preventDefault();
    
    if (isSearching) return;
    
    const searchKeywords = elements.stockSymbolInput.value.trim();
    
    if (!searchKeywords) {
        showError('Please enter a company name or stock symbol');
        elements.stockSymbolInput.focus();
        return;
    }

    isSearching = true;
    
    elements.resultsDiv.classList.add('d-none');
    showLoader('Searching for stock data...');

    try {
        const symbol = searchKeywords.toUpperCase();
        lastSymbol = symbol;
        
        const [newsData, priceData, quoteData] = await Promise.allSettled([
            fetchStockNews(symbol),
            fetchStockPrice(symbol),
            fetchStockQuote(symbol)
        ]);

        clearStatus();
        
        const news = newsData.status === 'fulfilled' ? newsData.value : { data: [] };
        const price = priceData.status === 'fulfilled' ? priceData.value : null;
        const quote = quoteData.status === 'fulfilled' ? quoteData.value : null;
        
        displayStockResults(symbol, news, price, quote);
        startRealTimeUpdates(symbol);
        
        elements.resultsDiv.classList.remove('d-none');
        elements.resultsDiv.classList.add('fade-in');
        
        setTimeout(() => {
            elements.resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
    } catch (error) {
        console.error('Search error:', error);
        showError(`Failed to fetch data: ${error.message}`);
    } finally {
        isSearching = false;
    }
}

function handleSearchInput(e) {
    const value = e.target.value.trim();
    if (value.length > 0) {
        // Could add autocomplete suggestions here
    }
}

async function fetchStockNews(symbol, retries = 0) {
    try {
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - 30);
        const toStr = today.toISOString().split('T')[0];
        const fromStr = fromDate.toISOString().split('T')[0];
        
        const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromStr}&to=${toStr}&token=${CONFIG.FINNHUB_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const newsData = await response.json();
        return { data: Array.isArray(newsData) ? newsData : [] };
        
    } catch (error) {
        if (retries < CONFIG.MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
            return fetchStockNews(symbol, retries + 1);
        }
        throw new Error(`Failed to fetch news: ${error.message}`);
    }
}

async function fetchStockPrice(symbol, retries = 0) {
    try {
        const today = new Date();
        const endDate = Math.floor(today.getTime() / 1000);
        const startDate = Math.floor((today.getTime() - 90 * 24 * 60 * 60 * 1000) / 1000);
        
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${startDate}&to=${endDate}&token=${CONFIG.FINNHUB_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const priceData = await response.json();
        
        if (priceData.s === 'ok' && priceData.c && priceData.t) {
            return {
                data: priceData.t.map((ts, i) => ({
                    date: new Date(ts * 1000).toISOString().split('T')[0],
                    close: priceData.c[i],
                    high: priceData.h[i],
                    low: priceData.l[i],
                    volume: priceData.v[i]
                })),
                meta: { currency: 'USD' }
            };
        } else {
            throw new Error('Invalid price data received');
        }
        
    } catch (error) {
        if (retries < CONFIG.MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
            return fetchStockPrice(symbol, retries + 1);
        }
        throw new Error(`Failed to fetch price data: ${error.message}`);
    }
}

async function fetchStockQuote(symbol, retries = 0) {
    try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${CONFIG.FINNHUB_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const quoteData = await response.json();
        
        if (quoteData.c) {
            return {
                current: quoteData.c,
                change: quoteData.d,
                changePercent: quoteData.dp,
                high: quoteData.h,
                low: quoteData.l,
                open: quoteData.o,
                previousClose: quoteData.pc
            };
        } else {
            throw new Error('Invalid quote data received');
        }
        
    } catch (error) {
        if (retries < CONFIG.MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
            return fetchStockQuote(symbol, retries + 1);
        }
        throw new Error(`Failed to fetch quote: ${error.message}`);
    }
}

async function getAiSuggestion(symbol, name, priceData) {
    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
        
        let priceContext = '';
        if (priceData && priceData.data && priceData.data.length > 0) {
            const latest = priceData.data[priceData.data.length - 1];
            const oldest = priceData.data[0];
            const change = ((latest.close - oldest.close) / oldest.close * 100).toFixed(2);
            priceContext = `Current price: $${latest.close.toFixed(2)}, 90-day change: ${change}%`;
        }
        
        const prompt = `As a helpful student assistant, provide a simple, one-paragraph analysis for the stock ${name} (${symbol}). 
        
        ${priceContext}
        
        Based on its recent performance, what is a general suggestion (buy, hold, or watch) for a beginner investor? 
        
        Keep it friendly, educational, and add a clear disclaimer that this is not financial advice. 
        Focus on learning aspects that would be helpful for students studying stock markets.`;

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('AI analysis service is currently unavailable.');
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates[0].content.parts[0].text) {
            return result.candidates[0].content.parts[0].text;
        }
        
        return "AI analysis is currently unavailable. Please try again later.";
        
    } catch (error) {
        console.error("AI Fetch Error:", error);
        return "AI analysis is temporarily unavailable. Please check back later.";
    }
}

function displayStockResults(symbol, newsData, priceData, quoteData) {
    elements.stockNameEl.textContent = `Analysis for ${symbol}`;
    displayNewsResults(newsData, symbol);
    
    if (priceData && priceData.data && priceData.data.length > 0) {
        renderStockChart(priceData.data, priceData.meta.currency);
    } else {
        showNoChartData();
    }
    
    getAiSuggestion(symbol, symbol, priceData).then(suggestion => {
        displayAiSuggestion(suggestion);
    });
}

function displayNewsResults(newsData, symbol) {
    if (newsData.data && newsData.data.length > 0) {
        const limitedNews = newsData.data.slice(0, 5);
        elements.stockInfoEl.innerHTML = limitedNews.map(news => {
            const title = news.headline || news.title || 'No headline';
            const dateRaw = news.datetime ? new Date(news.datetime * 1000) : (news.published_at ? new Date(news.published_at) : null);
            const dateStr = dateRaw ? dateRaw.toLocaleDateString() : 'No date';
            const desc = news.summary || news.description || '';
            const url = news.url || news.link || '#';
            
            return `
                <div class="news-item">
                    <div class="news-title">${escapeHtml(title)}</div>
                    <div class="news-date">${dateStr}</div>
                    <div class="news-desc">${escapeHtml(desc.substring(0, 150))}${desc.length > 150 ? '...' : ''}</div>
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="news-link">
                        <i class="fas fa-external-link-alt me-1"></i>Read more
                    </a>
                </div>
            `;
        }).join('');
        
        if (newsData.data.length > 5) {
            elements.stockInfoEl.innerHTML += `
                <div class="news-item text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    Showing 5 of ${newsData.data.length} articles.
                </div>`;
        }
    } else {
        elements.stockInfoEl.innerHTML = `
            <div class="news-item">
                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                No news found for ${symbol}.
            </div>`;
    }
}

function displayAiSuggestion(suggestion) {
    if (elements.aiSuggestionEl) {
        elements.aiSuggestionEl.innerHTML = suggestion.replace(/\n/g, '<br>');
    }
}

function renderStockChart(timeSeries, currency) {
    if (!elements.chartCanvas) return;
    
    const dates = timeSeries.map(item => item.date).slice(-90);
    const prices = timeSeries.map(item => item.close).slice(-90);
    const currencySymbol = getCurrencySymbol(currency);

    if (!prices || prices.length === 0) {
        showNoChartData();
        return;
    }

    if (stockChart) {
        stockChart.destroy();
    }

    const ctx = elements.chartCanvas.getContext('2d');
    
    if (typeof Chart === 'undefined') {
        showNoChartData();
        return;
    }
    
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: `Closing Price (${currency})`,
                data: prices,
                borderColor: CONFIG.CHART_COLORS.primary,
                backgroundColor: CONFIG.CHART_COLORS.background,
                borderWidth: 2,
                tension: 0.2,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: CONFIG.CHART_COLORS.primary,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    display: false,
                    grid: { display: false }
                },
                y: {
                    ticks: {
                        color: isDarkMode ? '#e2e8f0' : '#64748b',
                        font: { size: 12 },
                        callback: (value) => currencySymbol + value.toFixed(2)
                    },
                    grid: {
                        color: isDarkMode ? '#374151' : CONFIG.CHART_COLORS.grid,
                        drawBorder: false
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: CONFIG.CHART_COLORS.primary,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `Price: ${currencySymbol}${context.parsed.y.toFixed(2)}`
                    }
                }
            }
        }
    });
}

function showNoChartData() {
    if (!elements.chartCanvas) return;
    
    const ctx = elements.chartCanvas.getContext('2d');
    ctx.clearRect(0, 0, elements.chartCanvas.width, elements.chartCanvas.height);
    ctx.font = '18px Inter, Arial, sans-serif';
    ctx.fillStyle = isDarkMode ? '#9ca3af' : '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Price data not available for this symbol.', ctx.canvas.width / 2, ctx.canvas.height / 2);
}

function updateChartTheme() {
    if (stockChart) {
        const isDark = isDarkMode;
        stockChart.options.scales.y.ticks.color = isDark ? '#e2e8f0' : '#64748b';
        stockChart.options.scales.y.grid.color = isDark ? '#374151' : CONFIG.CHART_COLORS.grid;
        stockChart.options.plugins.tooltip.backgroundColor = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        stockChart.update();
    }
}

function startRealTimeUpdates(symbol) {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
    }
    
    chartUpdateInterval = setInterval(async () => {
        try {
            const quoteData = await fetchStockQuote(symbol);
            if (quoteData && stockChart) {
                updateChartRealtime(quoteData);
            }
        } catch (error) {
            console.error('Real-time update failed:', error);
        }
    }, CONFIG.REFRESH_INTERVAL);
}

function updateChartRealtime(quoteData) {
    if (!stockChart || !quoteData.current) return;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const chartData = stockChart.data;
    
    let lastIdx = chartData.labels.length - 1;
    if (chartData.labels[lastIdx] !== dateStr) {
        chartData.labels.push(dateStr);
        chartData.datasets[0].data.push(quoteData.current);
    } else {
        chartData.datasets[0].data[lastIdx] = quoteData.current;
    }
    
    stockChart.update('none');
}

async function loadLiveScreener() {
    if (!elements.liveScreenerContainer) return;
    
    elements.liveScreenerContainer.innerHTML = '';
    
    for (const stock of CONFIG.POPULAR_STOCKS) {
        const col = createLiveStockCard(stock);
        elements.liveScreenerContainer.appendChild(col);
        
        loadLiveStockData(stock, col).catch(error => {
            console.error(`Failed to load data for ${stock.symbol}:`, error);
            showLiveStockError(col, stock.symbol);
        });
    }
}

function createLiveStockCard(stock) {
    const col = document.createElement('div');
    col.className = 'col-lg-3 col-md-6 mb-4';
    col.innerHTML = `
        <div class="live-stock-card">
            <div class="text-center">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <div class="mt-2 small text-muted">${stock.symbol}</div>
                <div class="small text-muted">${stock.name}</div>
            </div>
        </div>`;
    return col;
}

async function loadLiveStockData(stock, col) {
    try {
        const [quoteData, newsData] = await Promise.allSettled([
            fetchStockQuote(stock.symbol),
            fetchStockNews(stock.symbol)
        ]);
        
        const quote = quoteData.status === 'fulfilled' ? quoteData.value : null;
        const news = newsData.status === 'fulfilled' ? newsData.value : null;
        
        updateLiveStockCard(col, stock, quote, news);
        
    } catch (error) {
        throw error;
    }
}

function updateLiveStockCard(col, stock, quote, news) {
    let content = '';
    
    if (quote && quote.current) {
        const changeClass = quote.change >= 0 ? 'positive' : 'negative';
        const changeIcon = quote.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        content = `
            <div class="live-stock-card">
                <div class="stock-symbol">${stock.symbol}</div>
                <div class="stock-name">${stock.name.split(' ')[0]}</div>
                <div class="stock-price">$${quote.current.toFixed(2)}</div>
                <div class="stock-change ${changeClass}">
                    <i class="fas ${changeIcon} me-1"></i>
                    $${Math.abs(quote.change).toFixed(2)} (${Math.abs(quote.changePercent).toFixed(2)}%)
                </div>
                ${news && news.data && news.data.length > 0 ? `
                    <div class="stock-news-title">${escapeHtml(news.data[0].headline.substring(0, 60))}...</div>
                    <div class="stock-news-date">${new Date(news.data[0].datetime * 1000).toLocaleDateString()}</div>
                ` : ''}
            </div>`;
    } else {
        content = `
            <div class="live-stock-card">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-warning mb-2"></i>
                    <div class="text-muted small">Data unavailable</div>
                    <div class="fw-bold small">${stock.symbol}</div>
                </div>
            </div>`;
    }
    
    col.innerHTML = content;
}

function showLiveStockError(col, symbol) {
    col.innerHTML = `
        <div class="live-stock-card">
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-warning mb-2"></i>
                <div class="text-danger small">Could not load</div>
                <div class="fw-bold small">${symbol}</div>
            </div>
        </div>`;
}

function showLoader(message = 'Loading...') {
    if (!elements.statusSection) return;
    
    elements.statusSection.innerHTML = `
        <div class="loader-container">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">${escapeHtml(message)}</p>
            <div class="loading-shimmer mt-2" style="height: 4px; width: 200px; border-radius: 2px; margin: 0 auto;"></div>
        </div>`;
    elements.statusSection.classList.remove('d-none');
    elements.statusSection.classList.add('fade-in');
}

function showError(message) {
    if (!elements.statusSection) return;
    
    elements.statusSection.innerHTML = `
        <div class="alert alert-danger fade-in">
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle me-3" style="font-size: 1.5rem;"></i>
                <div>
                    <strong>Error:</strong> ${escapeHtml(message)}
                </div>
            </div>
        </div>`;
    elements.statusSection.classList.remove('d-none');
    elements.statusSection.classList.add('fade-in');
}

function clearStatus() {
    if (elements.statusSection) {
        elements.statusSection.innerHTML = '';
        elements.statusSection.classList.add('d-none');
    }
}

function getCurrencySymbol(currencyCode) {
    const symbols = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'C$',
        'AUD': 'A$'
    };
    return symbols[currencyCode] || (currencyCode ? currencyCode + ' ' : '$');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toString();
}

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
    
    if (elements.currentTimeEl) {
        elements.currentTimeEl.textContent = `${dateString} ${timeString}`;
    }
}

function changeTimeframe(timeframe) {
    currentTimeframe = timeframe;
    
    document.querySelectorAll('.chart-controls .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (lastSymbol) {
        handleStockSearch(new Event('submit'));
    }
}

function testChartFunctionality() {
    if (!elements.chartCanvas) return;
    
    const testData = [];
    const today = new Date();
    for (let i = 90; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        testData.push({
            date: date.toISOString().split('T')[0],
            close: 100 + Math.random() * 50 + Math.sin(i * 0.1) * 10
        });
    }
    
    renderStockChart(testData, 'USD');
}

window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showError('An unexpected error occurred. Please refresh the page and try again.');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showError('A network error occurred. Please check your connection and try again.');
});

window.addEventListener('beforeunload', () => {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
    }
});

window.changeTimeframe = changeTimeframe;
window.testChartFunctionality = testChartFunctionality; 