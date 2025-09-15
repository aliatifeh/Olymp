// olymptrade-api.js - Simulated Olymp Trade API
class OlympTradeAPI {
    constructor() {
        this.connected = false;
        this.subscribedPairs = new Set();
        this.priceUpdateCallbacks = [];
        this.connectionInterval = null;
        this.priceUpdateInterval = null;
    }

    async connect() {
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        this.connected = true;
        this.connectionInterval = setInterval(() => {
            // Simulate occasional disconnections
            if (Math.random() < 0.05) {
                this.connected = false;
                setTimeout(() => {
                    this.connected = true;
                }, 5000);
            }
        }, 30000);
        
        // Start price updates for subscribed pairs
        this.startPriceUpdates();
        
        return true;
    }

    disconnect() {
        this.connected = false;
        this.subscribedPairs.clear();
        
        if (this.connectionInterval) {
            clearInterval(this.connectionInterval);
            this.connectionInterval = null;
        }
        
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
            this.priceUpdateInterval = null;
        }
    }

    isConnected() {
        return this.connected;
    }

    subscribeToPair(pair) {
        if (!this.connected) return false;
        
        this.subscribedPairs.add(pair);
        return true;
    }

    unsubscribeFromPair(pair) {
        this.subscribedPairs.delete(pair);
        return true;
    }

    startPriceUpdates() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
        }
        
        // Update prices every 500ms (simulated)
        this.priceUpdateInterval = setInterval(() => {
            if (!this.connected || this.subscribedPairs.size === 0) return;
            
            this.subscribedPairs.forEach(pair => {
                // Generate realistic price movement
                const price = this.generatePriceUpdate(pair);
                
                // Call all registered callbacks
                this.priceUpdateCallbacks.forEach(callback => {
                    try {
                        callback(pair, price);
                    } catch (error) {
                        console.error('Error in price update callback:', error);
                    }
                });
            });
        }, 500);
    }

    generatePriceUpdate(pair) {
        // Initialize price if not exists
        if (!this.pairPrices) {
            this.pairPrices = {};
        }
        
        if (!this.pairPrices[pair]) {
            // Set initial price based on pair type
            if (pair.includes('Index')) {
                this.pairPrices[pair] = 10000 + Math.random() * 5000;
            } else if (pair.includes('Gold')) {
                this.pairPrices[pair] = 1800 + Math.random() * 200;
            } else if (pair.includes('Silver')) {
                this.pairPrices[pair] = 20 + Math.random() * 5;
            } else {
                this.pairPrices[pair] = 1 + Math.random() * 0.5;
            }
        }
        
        // Generate price movement (more volatile for some pairs)
        let volatility = 0.0005; // Default volatility
        
        if (pair.includes('Crypto')) {
            volatility = 0.005; // Higher volatility for crypto
        } else if (pair.includes('Index')) {
            volatility = 0.001; // Moderate volatility for indices
        }
        
        // Random price change
        const change = (Math.random() - 0.5) * 2 * volatility * this.pairPrices[pair];
        this.pairPrices[pair] += change;
        
        // Ensure price doesn't go negative
        this.pairPrices[pair] = Math.max(this.pairPrices[pair], 0.0001);
        
        return parseFloat(this.pairPrices[pair].toFixed(6));
    }

    onPriceUpdate(callback) {
        this.priceUpdateCallbacks.push(callback);
    }

    removePriceUpdateCallback(callback) {
        const index = this.priceUpdateCallbacks.indexOf(callback);
        if (index > -1) {
            this.priceUpdateCallbacks.splice(index, 1);
        }
    }

    // Simulate getting historical data (not implemented in this simulation)
    async getHistoricalData(pair, timeframe, limit) {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = [];
                let basePrice = 100 + Math.random() * 50;
                
                for (let i = 0; i < limit; i++) {
                    const change = (Math.random() - 0.5) * 2 * 0.01 * basePrice;
                    basePrice += change;
                    
                    data.unshift({
                        open: basePrice - change,
                        high: basePrice + Math.random() * 0.005 * basePrice,
                        low: basePrice - Math.random() * 0.005 * basePrice,
                        close: basePrice,
                        timestamp: Date.now() - (i * timeframe * 1000)
                    });
                }
                
                resolve(data);
            }, 500);
        });
    }
}

// Initialize the API
window.olymptradeAPI = new OlympTradeAPI();