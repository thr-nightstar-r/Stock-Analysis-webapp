# StockSmart - Modular Stock Analysis App

A clean, modular stock analysis application for students. Separated into focused files for better maintainability.

## 📁 File Structure

```
Stacks analysis/
├── index.html          # Main HTML structure
├── style.css           # Essential styles only
├── config.js           # Configuration & constants
├── utils.js            # Helper functions
├── api.js              # API calls & data fetching
├── chart.js            # Chart functionality
├── ui.js               # UI display functions
├── app.js              # Main application logic
└── README.md           # This file
```

## 🚀 Quick Start

1. **Open** `index.html` in any modern browser
2. **Search** for any stock symbol (e.g., AAPL, TSLA, MSFT)
3. **View** real-time data, charts, news, and AI insights

## 📋 File Purposes

### **config.js** - Configuration
- API keys and endpoints
- Popular stocks list
- Chart colors and settings
- App constants

### **utils.js** - Helper Functions
- Currency symbol mapping
- HTML escaping
- Number formatting
- Debounce function
- Time display

### **api.js** - Data Fetching
- Stock news from Finnhub
- Price history data
- Real-time quotes
- AI analysis from Gemini

### **chart.js** - Chart Management
- Chart.js integration
- Real-time updates
- Theme switching
- Test functionality

### **ui.js** - Display Functions
- News rendering
- Live screener
- Loading states
- Error handling

### **app.js** - Core Logic
- Event listeners
- Search handling
- Dark mode
- App initialization

## 🎯 Key Features

- ✅ **Real-time stock data** with live updates
- ✅ **Interactive charts** with multiple timeframes
- ✅ **AI-powered analysis** for educational insights
- ✅ **Latest news** from reliable sources
- ✅ **Live market overview** of popular stocks
- ✅ **Dark mode** with theme persistence
- ✅ **Mobile responsive** design
- ✅ **Modular architecture** for easy maintenance

## 🔧 Customization

### Add New Stocks
Edit `config.js`:
```javascript
POPULAR_STOCKS: [
    { symbol: 'YOUR_STOCK', name: 'Your Company' }
]
```

### Change API Keys
Edit `config.js`:
```javascript
GEMINI_API_KEY: 'your-key',
FINNHUB_API_KEY: 'your-key'
```

### Modify Colors
Edit `style.css`:
```css
:root {
    --primary-color: #your-color;
}
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## ⚠️ Disclaimer

**Educational purposes only. Not financial advice. Always do your own research.**

---

**Made with ❤️ for students learning about stock markets** 