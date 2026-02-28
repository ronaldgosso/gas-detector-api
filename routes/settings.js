const express = require('express');
const router = express.Router();
const db = require('../config/database');
require('express-validator');

// ===== GET SYSTEM SETTINGS =====
router.get('/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT setting_key, setting_value, description FROM settings');
        const settings = {};
        result.forEach(row => { settings[row.setting_key] = row.setting_value; });
        settings['api_version'] = process.env.API_VERSION || 'v1';
        settings['node_env'] = process.env.NODE_ENV || 'development';
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching settings', error: error.message });
    }
});

// ===== UPDATE SYSTEM SETTINGS =====
router.post('/settings', async (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid settings format' });
        }
        for (const [key, value] of Object.entries(settings)) {
            await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value.toString(), key]);
        }
        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating settings', error: error.message });
    }
});

module.exports = router;