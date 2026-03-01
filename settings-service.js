const db = require('./database');

class SettingsService {
    constructor() {
        this.cache = {};
        this.lastFetch = 0;
        this.ttl = 60000; // 1 minute cache
    }

    async getAllSettings() {
        const now = Date.now();
        if (now - this.lastFetch < this.ttl && Object.keys(this.cache).length > 0) {
            return this.cache;
        }

        try {
            const result = await db.query('SELECT setting_key, setting_value FROM settings');
            const settings = {};
            result.forEach(row => {
                settings[row.setting_key] = row.setting_value;
            });
            this.cache = settings;
            this.lastFetch = now;
            return settings;
        } catch (error) {
            console.error('Error fetching settings from DB:', error.message);
            return this.cache; // Return stale cache if DB fails
        }
    }

    async getSetting(key, defaultValue = null) {
        const settings = await this.getAllSettings();
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

    async getGasThreshold() {
        const val = await this.getSetting('gas_threshold', '800');
        return parseInt(val);
    }

    async getRefreshInterval() {
        const val = await this.getSetting('refresh_interval', '2');
        return parseInt(val);
    }

    async getBluetoothPort() {
        return await this.getSetting('bluetooth_port', 'COM5');
    }

    async getApiEndpoint() {
        return await this.getSetting('api_endpoint_url', 'http://localhost:3000');
    }

    // Force refresh the cache
    async refresh() {
        this.lastFetch = 0;
        return await this.getAllSettings();
    }
}

module.exports = new SettingsService();
