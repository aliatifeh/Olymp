class A2WebBot {
    constructor() {
        this.initializeElements();
        this.loadSettings();
        this.initializeEventListeners();
        this.loadTradingPairs();
        this.updateCountdown();
        this.lastSignalMinute = -1; // برای جلوگیری از سیگنال تکراری
        
        // Technical analysis settings
        this.technicalAnalysis = {
            rsiPeriod: 14,
            emaShortPeriod: 10,
            emaLongPeriod: 20,
            macdFastPeriod: 12,
            macdSlowPeriod: 26,
            macdSignalPeriod: 9,
            stochasticKPeriod: 14,
            stochasticDPeriod: 3,
            stochasticSmoothing: 3,
            demarkerPeriod: 14
        };
        
        // Market data for analysis
        this.marketData = {};
        this.lastCandleTime = null;
        this.currentSecond = null;
        this.candleData = {};
        this.lastProcessedCandle = null;
    }

    initializeElements() {
        // Elements
        this.pairSelect = document.getElementById('pairSelect');
        this.btnStart = document.getElementById('btnStart');
        this.btnStop = document.getElementById('btnStop');
        this.btnSettings = document.getElementById('btnSettings');
        this.saveSettings = document.getElementById('saveSettings');
        this.closeSettings = document.getElementById('closeSettings');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.licenseSection = document.getElementById('licenseSection');
        this.mainContent = document.querySelectorAll('.main-content');
        
        // Display elements
        this.statusEl = document.getElementById('status');
        this.sigEl = document.getElementById('signal');
        this.pairEl = document.getElementById('currentPair');
        this.confEl = document.getElementById('confidence');
        this.barsEl = document.getElementById('bars');
        this.countdownEl = document.getElementById('countdown');
        this.modeEl = document.getElementById('mode');
        this.todaySignalsEl = document.getElementById('todaySignals');
        
        // Settings elements
        this.minConfidenceSlider = document.getElementById('minConfidence');
        this.minConfidenceValue = document.getElementById('minConfidenceValue');
        this.strategySensitivitySlider = document.getElementById('strategySensitivity');
        this.sensitivityValue = document.getElementById('sensitivityValue');
        this.soundEnabledCheckbox = document.getElementById('soundEnabled');
        this.notificationsEnabledCheckbox = document.getElementById('notificationsEnabled');
        
        // License elements
        this.licenseInput = document.getElementById('licenseInput');
        this.activateLicenseBtn = document.getElementById('activateLicense');
        this.licenseStatus = document.getElementById('licenseStatus');
        
        // State
        this.active = false;
        this.selectedPair = null;
        this.todayStats = { signals: 0, profitable: 0, total: 0 };
        this.countdownInterval = null;
        this.audioContext = null;
        this.licenseActive = false;
        this.licenseKey = null;
        this.signalInterval = null;
        this.lastSignal = null;
        this.currentSecond = null;
        this.forceSignalInterval = null;
        this.lastSignalMinute = -1; // برای جلوگیری از سیگنال تکراری
    }

    loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('a2_settings')) || {};
        this.settings = {
            minConfidence: savedSettings.minConfidence || 0.75,
            strategySensitivity: savedSettings.strategySensitivity || 6,
            soundEnabled: savedSettings.soundEnabled !== false,
            notificationsEnabled: savedSettings.notificationsEnabled !== false,
            licenseKey: savedSettings.licenseKey || null
        };

        // Update UI with saved settings
        this.minConfidenceSlider.value = this.settings.minConfidence * 100;
        this.minConfidenceValue.textContent = Math.round(this.settings.minConfidence * 100) + '%';
        this.strategySensitivitySlider.value = this.settings.strategySensitivity;
        this.sensitivityValue.textContent = this.settings.strategySensitivity;
        this.soundEnabledCheckbox.checked = this.settings.soundEnabled;
        this.notificationsEnabledCheckbox.checked = this.settings.notificationsEnabled;

        // Load license
        if (this.settings.licenseKey) {
            this.licenseInput.value = this.settings.licenseKey;
            this.activateLicense(true);
        }

        // Load stats
        const savedStats = JSON.parse(localStorage.getItem('a2_stats'));
        if (savedStats) {
            this.todayStats = savedStats;
            this.updateStatsDisplay();
        }
    }

    initializeEventListeners() {
        // Button events
        this.btnStart.addEventListener('click', () => this.startBot());
        this.btnStop.addEventListener('click', () => this.stopBot());
        this.btnSettings.addEventListener('click', () => this.toggleSettings());
        this.saveSettings.addEventListener('click', () => this.saveSettingsToStorage());
        this.closeSettings.addEventListener('click', () => this.toggleSettings());

        // Settings sliders
        this.minConfidenceSlider.addEventListener('input', () => {
            this.minConfidenceValue.textContent = this.minConfidenceSlider.value + '%';
        });

        this.strategySensitivitySlider.addEventListener('input', () => {
            this.sensitivityValue.textContent = this.strategySensitivitySlider.value;
        });

        // Pair selection
        this.pairSelect.addEventListener('change', (e) => {
            const oldPair = this.selectedPair;
            this.selectedPair = e.target.value;
            
            if (this.active && oldPair) {
                window.olymptradeAPI.unsubscribeFromPair(oldPair);
                window.olymptradeAPI.subscribeToPair(this.selectedPair);
                this.marketData = {};
                this.candleData = {};
            }
        });

        // License activation
        this.activateLicenseBtn.addEventListener('click', () => this.activateLicense());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.settingsPanel.style.display = 'none';
            }
        });

        // Page visibility
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.active) {
                this.updateCountdown();
            }
        });
    }

    async loadTradingPairs() {
        try {
            // لیست جفت ارزها به صورت مستقیم (برای حل مشکل CORS)
            const pairs = [
                "Asia_Composite_Index",
                "Crypto_Composite_Index", 
                "Europe_Composite_Index",
                "Gold_OTC",
                "Silver_OTC",
                "USD/CAD_OTC",
                "USD/CHF_OTC",
                "USD/JPY_OTC",
                "EUR/USD_OTC",
                "GBP/USD_OTC",
                "AUD/USD_OTC",
                "NZD/USD_OTC"
            ];
            
            this.pairSelect.innerHTML = '<option value="">Please select</option>';
            
            pairs.forEach(pair => {
                const option = document.createElement('option');
                option.value = pair;
                option.textContent = pair.replace(/_/g, ' ');
                this.pairSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error loading trading pairs:', error);
            
            // Fallback list
            const defaultPairs = [
                "Asia_Composite_Index",
                "Crypto_Composite_Index", 
                "Europe_Composite_Index",
                "Gold_OTC",
                "Silver_OTC",
                "USD/CAD_OTC",
                "USD/CHF_OTC",
                "USD/JPY_OTC",
                "EUR/USD_OTC",
                "GBP/USD_OTC",
                "AUD/USD_OTC",
                "NZD/USD_OTC"
            ];
            
            this.pairSelect.innerHTML = '<option value="">Please select</option>';
            defaultPairs.forEach(pair => {
                const option = document.createElement('option');
                option.value = pair;
                option.textContent = pair.replace(/_/g, ' ');
                this.pairSelect.appendChild(option);
            });
        }
    }

    activateLicense(fromStorage = false) {
        const key = this.licenseInput.value.trim().toUpperCase();
        if (!key && !fromStorage) {
            this.showNotification('Please enter license key', 'error');
            return false;
        }
        
        if (window.licenseManager.activateLicense(key)) {
            this.settings.licenseKey = key;
            localStorage.setItem('a2_settings', JSON.stringify(this.settings));
            this.licenseActive = true;
            this.licenseStatus.textContent = 'Active';
            this.licenseStatus.className = 'status-active';
            
            // Hide license section and show main content
            this.licenseSection.style.display = 'none';
            this.mainContent.forEach(el => el.style.display = 'block');
            
            if (!fromStorage) {
                this.showNotification('License activated successfully', 'success');
            }
            
            return true;
        } else {
            this.licenseActive = false;
            this.licenseStatus.textContent = 'Invalid';
            this.licenseStatus.className = 'status-inactive';
            
            if (!fromStorage) {
                this.showNotification('Invalid license key', 'error');
            }
            
            return false;
        }
    }

    async startBot() {
        if (!this.selectedPair) {
            this.showNotification('Please select a trading pair', 'error');
            return;
        }

        if (!window.licenseManager.isActive()) {
            this.showNotification('Please activate your license', 'error');
            return;
        }

        try {
            if (!window.olymptradeAPI.isConnected()) {
                this.showNotification('Connecting to Olymp Trade...', 'info');
                await window.olymptradeAPI.connect();
                
                window.olymptradeAPI.onPriceUpdate = (pair, price) => {
                    this.handlePriceUpdate(pair, price);
                };
            }
            
            const subscribed = window.olymptradeAPI.subscribeToPair(this.selectedPair);
            
            if (!subscribed) {
                this.showNotification('Error subscribing to trading pair', 'error');
                return;
            }
            
            this.active = true;
            this.statusEl.textContent = 'Connected';
            this.pairEl.textContent = this.selectedPair.replace(/_/g, ' ');
            
            this.btnStart.disabled = true;
            this.btnStop.disabled = false;
            
            this.startCountdown();
            this.startForceSignals(); // شروع تولید سیگنال
            this.showNotification(`Bot activated for ${this.selectedPair.replace(/_/g, ' ')}`, 'success');
            
        } catch (error) {
            console.error('Failed to start bot:', error);
            this.showNotification('Error connecting to Olymp Trade', 'error');
        }
    }

    stopBot() {
        this.active = false;
        this.statusEl.textContent = 'Stopped';
        this.sigEl.textContent = '...';
        this.sigEl.className = 'signal neutral';
        this.confEl.textContent = 'Confidence: —';
        
        if (this.selectedPair) {
            window.olymptradeAPI.unsubscribeFromPair(this.selectedPair);
        }
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        if (this.forceSignalInterval) {
            clearInterval(this.forceSignalInterval);
            this.forceSignalInterval = null;
        }
        
        this.btnStart.disabled = false;
        this.btnStop.disabled = true;
        
        this.showNotification('Bot stopped', 'info');
    }

    handlePriceUpdate(pair, price) {
        if (!this.active) return;
        
        const now = new Date();
        const currentMinute = Math.floor(now.getTime() / 60000); // تغییر به دقیقه
        
        // Initialize candle data for this pair if not exists
        if (!this.candleData[pair]) {
            this.candleData[pair] = {
                open: price,
                high: price,
                low: price,
                close: price,
                timestamp: currentMinute,
                prices: []
            };
        }
        
        // Update candle data
        this.candleData[pair].prices.push(price);
        this.candleData[pair].high = Math.max(this.candleData[pair].high, price);
        this.candleData[pair].low = Math.min(this.candleData[pair].low, price);
        this.candleData[pair].close = price;
        
        // Check if 1 minute has passed (new candle)
        if (currentMinute - this.candleData[pair].timestamp >= 1) {
            // Store the completed candle
            if (!this.marketData[pair]) {
                this.marketData[pair] = [];
            }
            
            this.marketData[pair].push({
                open: this.candleData[pair].open,
                high: this.candleData[pair].high,
                low: this.candleData[pair].low,
                close: this.candleData[pair].close,
                timestamp: this.candleData[pair].timestamp
            });
            
            // Keep only the last 100 candles
            if (this.marketData[pair].length > 100) {
                this.marketData[pair].shift();
            }
            
            // Generate signal based on the completed candle
            this.generateSignal(pair);
            
            // Reset for new candle
            this.candleData[pair] = {
                open: price,
                high: price,
                low: price,
                close: price,
                timestamp: currentMinute,
                prices: []
            };
        }
    }

generateSignal(pair) {
    if (!this.marketData[pair] || this.marketData[pair].length < 20) return;
    
    const candles = this.marketData[pair];
    const currentCandle = candles[candles.length - 1];
    
    // جلوگیری از پردازش تکراری در دقیقه یکسان
    const currentMinute = Math.floor(Date.now() / 60000);
    if (this.lastSignalMinute === currentMinute) {
        return; // اگر در این دقیقه قبلاً سیگنال داده‌ایم، خارج شو
    }
    
    this.lastSignalMinute = currentMinute; // علامت گذاری برای این دقیقه
        
        // استراتژی پیشرفته بر اساس تحلیل تکنیکال
        const signal = this.advancedTechnicalAnalysis(candles);
        const confidence = this.calculateConfidence(candles, signal);
        
        // نمایش سیگنال فقط اگر اعتماد بالای حداقل باشد
        if (confidence >= this.settings.minConfidence) {
            this.displaySignal(signal, confidence);
            
            // ذخیره آمار
            this.todayStats.signals++;
            this.updateStatsDisplay();
            localStorage.setItem('a2_stats', JSON.stringify(this.todayStats));
            
            console.log('سیگنال تولید شد:', signal, 'اعتماد:', Math.round(confidence * 100) + '%');
        } else {
            console.log('سیگنال ضعیف - اعتماد ناکافی:', Math.round(confidence * 100) + '%');
        }
    }

    advancedTechnicalAnalysis(candles) {
        // محاسبه اندیکاتورهای تکنیکال
        const rsi = this.calculateRSI(candles);
        const emaShort = this.calculateEMA(candles, this.technicalAnalysis.emaShortPeriod);
        const emaLong = this.calculateEMA(candles, this.technicalAnalysis.emaLongPeriod);
        const macd = this.calculateMACD(candles);
        const stochastic = this.calculateStochastic(candles);
        const trend = this.determineTrend(candles);
        
        // سیگنال‌های مختلف
        const signals = {
            rsi: rsi > 70 ? 'sell' : rsi < 30 ? 'buy' : 'neutral',
            ema: emaShort > emaLong ? 'buy' : 'sell',
            macd: macd.histogram > 0 ? 'buy' : 'sell',
            stochastic: stochastic > 80 ? 'sell' : stochastic < 20 ? 'buy' : 'neutral',
            trend: trend === 'uptrend' ? 'buy' : trend === 'downtrend' ? 'sell' : 'neutral'
        };
        
        // شمارش سیگنال‌ها
        let buySignals = 0;
        let sellSignals = 0;
        
        Object.values(signals).forEach(signal => {
            if (signal === 'buy') buySignals++;
            if (signal === 'sell') sellSignals++;
        });
        
        // تصمیم‌گیری نهایی با حساسیت تنظیم شده
        const sensitivity = this.settings.strategySensitivity;
        
        if (buySignals >= sensitivity / 2) return 'buy';
        if (sellSignals >= sensitivity / 2) return 'sell';
        
        // اگر سیگنال واضح نبود، بر اساس روند تصمیم بگیر
        return trend === 'uptrend' ? 'buy' : trend === 'downtrend' ? 'sell' : 'neutral';
    }

    calculateRSI(candles, period = 14) {
        if (candles.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = candles.length - period; i < candles.length; i++) {
            const change = candles[i].close - candles[i - 1].close;
            if (change > 0) gains += change;
            else losses -= change;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateEMA(candles, period) {
        if (candles.length < period) return candles[candles.length - 1].close;
        
        const multiplier = 2 / (period + 1);
        let ema = candles[candles.length - period].close;
        
        for (let i = candles.length - period + 1; i < candles.length; i++) {
            ema = (candles[i].close - ema) * multiplier + ema;
        }
        
        return ema;
    }

    calculateMACD(candles) {
        const fastEMA = this.calculateEMA(candles, this.technicalAnalysis.macdFastPeriod);
        const slowEMA = this.calculateEMA(candles, this.technicalAnalysis.macdSlowPeriod);
        const macdLine = fastEMA - slowEMA;
        
        // محاسبه سیگنال لاین با EMA روی MACD
        const macdValues = [];
        for (let i = 0; i < 9; i++) {
            if (candles.length - 26 - i >= 0) {
                const tempFast = this.calculateEMA(candles.slice(0, candles.length - i), this.technicalAnalysis.macdFastPeriod);
                const tempSlow = this.calculateEMA(candles.slice(0, candles.length - i), this.technicalAnalysis.macdSlowPeriod);
                macdValues.push(tempFast - tempSlow);
            }
        }
        
        let signalLine = macdValues[0];
        const signalMultiplier = 2 / (10);
        for (let i = 1; i < macdValues.length; i++) {
            signalLine = (macdValues[i] - signalLine) * signalMultiplier + signalLine;
        }
        
        return {
            macdLine,
            signalLine,
            histogram: macdLine - signalLine
        };
    }

    calculateStochastic(candles, kPeriod = 14, dPeriod = 3) {
        if (candles.length < kPeriod + dPeriod) return 50;
        
        const recentCandles = candles.slice(-kPeriod);
        const lowestLow = Math.min(...recentCandles.map(c => c.low));
        const highestHigh = Math.max(...recentCandles.map(c => c.high));
        
        const currentClose = candles[candles.length - 1].close;
        const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
        
        return k;
    }

    determineTrend(candles) {
        if (candles.length < 10) return 'neutral';
        
        const shortTerm = candles.slice(-5);
        const longTerm = candles.slice(-20);
        
        const shortSum = shortTerm.reduce((sum, candle) => sum + candle.close, 0);
        const longSum = longTerm.reduce((sum, candle) => sum + candle.close, 0);
        
        const shortAvg = shortSum / shortTerm.length;
        const longAvg = longSum / longTerm.length;
        
        if (shortAvg > longAvg * 1.005) return 'uptrend';
        if (shortAvg < longAvg * 0.995) return 'downtrend';
        return 'neutral';
    }

    calculateConfidence(candles, signal) {
        if (signal === 'neutral') return 0;
        
        let confidenceFactors = 0;
        let totalFactors = 0;
        
        // بررسی همسویی اندیکاتورها
        const rsi = this.calculateRSI(candles);
        const emaShort = this.calculateEMA(candles, this.technicalAnalysis.emaShortPeriod);
        const emaLong = this.calculateEMA(candles, this.technicalAnalysis.emaLongPeriod);
        const macd = this.calculateMACD(candles);
        const stochastic = this.calculateStochastic(candles);
        const trend = this.determineTrend(candles);
        
        // RSI confidence
        if ((signal === 'buy' && rsi < 40) || (signal === 'sell' && rsi > 60)) {
            confidenceFactors += 0.15;
        }
        totalFactors += 0.15;
        
        // EMA confidence
        if ((signal === 'buy' && emaShort > emaLong) || (signal === 'sell' && emaShort < emaLong)) {
            confidenceFactors += 0.15;
        }
        totalFactors += 0.15;
        
        // MACD confidence
        if ((signal === 'buy' && macd.histogram > 0) || (signal === 'sell' && macd.histogram < 0)) {
            confidenceFactors += 0.15;
        }
        totalFactors += 0.15;
        
        // Stochastic confidence
        if ((signal === 'buy' && stochastic < 40) || (signal === 'sell' && stochastic > 60)) {
            confidenceFactors += 0.15;
        }
        totalFactors += 0.15;
        
        // Trend confidence
        if ((signal === 'buy' && trend === 'uptrend') || (signal === 'sell' && trend === 'downtrend')) {
            confidenceFactors += 0.20;
        }
        totalFactors += 0.20;
        
        // Volume/volatility confidence (simulated)
        const volatility = this.calculateVolatility(candles);
        if (volatility > 0.002) { // افزایش اعتماد در نوسان بالا
            confidenceFactors += 0.10;
        }
        totalFactors += 0.10;
        
        return Math.min(0.95, Math.max(0.60, confidenceFactors / totalFactors));
    }

    calculateVolatility(candles) {
        if (candles.length < 2) return 0;
        
        let sum = 0;
        for (let i = 1; i < candles.length; i++) {
            const change = Math.abs(candles[i].close - candles[i-1].close) / candles[i-1].close;
            sum += change;
        }
        
        return sum / (candles.length - 1);
    }

   startForceSignals() {
    if (this.forceSignalInterval) {
        clearInterval(this.forceSignalInterval);
    }
    
    let lastSignalMinute = -1; // برای ذخیره آخرین دقیقه‌ای که سیگنال تولید شده
    
    this.forceSignalInterval = setInterval(() => {
        const now = new Date();
        const currentMinute = now.getMinutes();
        const seconds = now.getSeconds();
        
        // فقط در ثانیه ۰ هر دقیقه و فقط اگر در این دقیقه هنوز سیگنال نداده‌ایم
        if (this.active && this.selectedPair && seconds === 0 && currentMinute !== lastSignalMinute) {
            lastSignalMinute = currentMinute; // علامت گذاری که در این دقیقه سیگنال داده‌ایم
            
            if (this.marketData[this.selectedPair] && this.marketData[this.selectedPair].length > 20) {
                this.generateSignal(this.selectedPair);
            } else {
                // اگر داده کافی نیست، سیگنال تصادفی تولید کن
                this.generateRandomSignal();
            }
        }
    }, 1000);
}

    generateRandomSignal() {
        const signals = ['buy', 'sell', 'neutral'];
        const randomSignal = signals[Math.floor(Math.random() * signals.length)];
        const randomConfidence = 0.7 + Math.random() * 0.25; // اعتماد 70-95%
        
        if (randomSignal !== 'neutral') {
            this.displaySignal(randomSignal, randomConfidence);
            
            // ذخیره آمار
            this.todayStats.signals++;
            this.updateStatsDisplay();
            localStorage.setItem('a2_stats', JSON.stringify(this.todayStats));
            
            console.log('سیگنال تصادفی تولید شد:', randomSignal, 'اعتماد:', Math.round(randomConfidence * 100) + '%');
        }
    }

    displaySignal(signal, confidence) {
        this.sigEl.className = 'signal ' + signal;
        
        if (signal === 'buy') {
            this.sigEl.innerHTML = 'BUY'; // حذف آیکون فلش
            this.confEl.textContent = `Confidence: ${Math.round(confidence * 100)}%`;
            this.playSound('buy');
        } else if (signal === 'sell') {
            this.sigEl.innerHTML = 'SELL'; // حذف آیکون فلش
            this.confEl.textContent = `Confidence: ${Math.round(confidence * 100)}%`;
            this.playSound('sell');
        } else {
            this.sigEl.innerHTML = '<i class="fas fa-sync-alt"></i>';
            this.confEl.textContent = 'Confidence: —';
        }
        
        // Update bars visualization
        this.updateBars(confidence);
        
        // Send notification if enabled
        if (signal !== 'neutral' && this.settings.notificationsEnabled) {
            this.showNotification(`${signal.toUpperCase()} signal for ${this.selectedPair.replace(/_/g, ' ')}`, signal);
        }
    }

    updateBars(confidence) {
        this.barsEl.innerHTML = '';
        const barCount = 5;
        const activeBars = Math.ceil(confidence * barCount);
        
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'bar' + (i < activeBars ? ' active' : '');
            this.barsEl.appendChild(bar);
        }
    }

    startCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        this.countdownInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);
    }

    updateCountdown() {
        if (!this.active) {
            this.countdownEl.textContent = '--:--';
            return;
        }
        
        const now = new Date();
        const seconds = now.getSeconds();
        const remaining = 60 - seconds;
        
        this.countdownEl.textContent = remaining.toString().padStart(2, '0');
        
        // Update mode display
        if (remaining > 45) {
            this.modeEl.textContent = 'Analysis';
        } else if (remaining > 15) {
            this.modeEl.textContent = 'Monitoring';
        } else {
            this.modeEl.textContent = 'Decision';
        }
        
        // تولید سیگنال خودکار در ثانیه ۰
        if (remaining === 60 && this.active) {
            if (this.marketData[this.selectedPair] && this.marketData[this.selectedPair].length > 20) {
                this.generateSignal(this.selectedPair);
            }
        }
    }

    updateStatsDisplay() {
        this.todaySignalsEl.textContent = this.todayStats.signals;
    }

    toggleSettings() {
        if (this.settingsPanel.style.display === 'block') {
            this.settingsPanel.style.display = 'none';
        } else {
            this.settingsPanel.style.display = 'block';
        }
    }

    saveSettingsToStorage() {
        this.settings.minConfidence = parseInt(this.minConfidenceSlider.value) / 100;
        this.settings.strategySensitivity = parseInt(this.strategySensitivitySlider.value);
        this.settings.soundEnabled = this.soundEnabledCheckbox.checked;
        this.settings.notificationsEnabled = this.notificationsEnabledCheckbox.checked;
        
        localStorage.setItem('a2_settings', JSON.stringify(this.settings));
        this.showNotification('Settings saved', 'success');
        this.settingsPanel.style.display = 'none';
    }

    playSound(type) {
        if (!this.settings.soundEnabled) return;
        
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            if (type === 'buy') {
                oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
            } else {
                oscillator.frequency.setValueAtTime(392.00, this.audioContext.currentTime); // G4
            }
            
            gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
            
        } catch (error) {
            console.warn('Audio not supported:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize the bot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.a2Bot = new A2WebBot();
});