const express = require('express');
const router = express.Router();
const db = require('../config/database');
require('express-validator');

// ===== GET REAL-TIME CHART DATA =====
router.get('/chart/data', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const result = await db.query('SELECT id, gas_level, status, timestamp FROM incidents ORDER BY timestamp DESC LIMIT ?', [limit]);
        result.reverse();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching chart data', error: error.message });
    }
});

module.exports = router;