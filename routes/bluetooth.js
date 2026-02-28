const express = require('express');
const router = express.Router();
const db = require('../config/database');
require('express-validator');

// ===== GET BLUETOOTH STATUS =====
router.get('/bluetooth/status', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM bluetooth_connections ORDER BY last_connected DESC LIMIT 1');
        res.json({ success: true, data: result.length > 0 ? result[0] : null });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching Bluetooth status', error: error.message });
    }
});

module.exports = router;