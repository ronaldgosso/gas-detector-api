const express = require('express');
const router = express.Router();
const db = require('../config/database');
require('express-validator');

// ===== GET SYSTEM LOGS =====
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const type = req.query.type;
        let sql = 'SELECT * FROM system_logs WHERE 1=1';
        let params = [];
        if (type && type !== 'all') { sql += ' AND log_type = ?'; params.push(type); }
        sql += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);
        const results = await db.query(sql, params);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching logs', error: error.message });
    }
});

module.exports = router;