const express = require('express');
const router = express.Router();
const db = require('../config/database');
require('express-validator');

// ===== HEALTH CHECK =====
router.get('/health', async (req, res) => {
    try {
        const [result] = await db.pool.query('SELECT 1');
        res.json({
            success: true,
            message: 'API is running',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'API is running but database disconnected',
            error: error.message
        });
    }
});

module.exports = router;