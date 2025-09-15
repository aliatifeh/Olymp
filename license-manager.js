// license-manager.js - License validation system
class LicenseManager {
    constructor() {
        this.licenseActive = false;
        this.licenseKey = null;
        this.validLicenses = new Set();
        this.initializeValidLicenses();
    }

    initializeValidLicenses() {
        // Add some valid license keys (in real implementation, this would be server-side)
        this.validLicenses.add('A2BOT-2023-PRO-ULTRA-MAX');
        this.validLicenses.add('OLYMP-TRADE-SIGNAL-BOT-V2');
        this.validLicenses.add('A2BOT-PREMIUM-ACCESS-2023');
        this.validLicenses.add('ALI-ATIFEH-LICENSE-KEY');
        this.validLicenses.add('A2BOT-ELITE-VERSION-2023');
        
        // Also check for previously activated licenses
        const savedSettings = JSON.parse(localStorage.getItem('a2_settings'));
        if (savedSettings && savedSettings.licenseKey) {
            if (this.validLicenses.has(savedSettings.licenseKey)) {
                this.licenseActive = true;
                this.licenseKey = savedSettings.licenseKey;
            }
        }
    }

    activateLicense(key) {
        const normalizedKey = key.trim().toUpperCase();
        
        if (this.validLicenses.has(normalizedKey)) {
            this.licenseActive = true;
            this.licenseKey = normalizedKey;
            
            // Save to localStorage
            const savedSettings = JSON.parse(localStorage.getItem('a2_settings')) || {};
            savedSettings.licenseKey = normalizedKey;
            localStorage.setItem('a2_settings', JSON.stringify(savedSettings));
            
            return true;
        }
        
        return false;
    }

    isActive() {
        return this.licenseActive;
    }

    getLicenseInfo() {
        if (!this.licenseActive) return null;
        
        return {
            key: this.licenseKey,
            type: this.licenseKey.includes('PRO') ? 'Professional' : 
                  this.licenseKey.includes('ELITE') ? 'Elite' : 'Standard',
            activated: Date.now(),
            valid: true
        };
    }

    deactivateLicense() {
        this.licenseActive = false;
        this.licenseKey = null;
        
        // Remove from localStorage
        const savedSettings = JSON.parse(localStorage.getItem('a2_settings')) || {};
        delete savedSettings.licenseKey;
        localStorage.setItem('a2_settings', JSON.stringify(savedSettings));
        
        return true;
    }

    validateLicense() {
        if (!this.licenseActive) return false;
        
        // Simulate server-side validation
        return this.validLicenses.has(this.licenseKey);
    }
}

// Initialize license manager
window.licenseManager = new LicenseManager();