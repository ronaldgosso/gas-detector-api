const express = require('express');
const router = express.Router();
const db = require('../config/database');
require('express-validator');

// ===== GET STATISTICS =====
router.get('/statistics', async (req, res) => {
    try {
        const [totalResult] = await db.pool.query('SELECT COUNT(*) as total FROM incidents');
        const [todayResult] = await db.pool.query("SELECT COUNT(*) as count FROM incidents WHERE status = 'ALERT' AND DATE(timestamp) = CURDATE()");
        const [lastAlertResult] = await db.pool.query("SELECT timestamp FROM incidents WHERE status = 'ALERT' ORDER BY timestamp DESC LIMIT 1");
        const [statsResult] = await db.pool.query('SELECT AVG(gas_level) as avg_level, MAX(gas_level) as max_level, MIN(gas_level) as min_level FROM incidents');
        const [distributionResult] = await db.pool.query("SELECT status, COUNT(*) as count FROM incidents GROUP BY status");

        const distribution = {};
        distributionResult.forEach(row => { distribution[row.status] = row.count; });

        res.json({
            success: true,
            totalRecords: totalResult[0].total,
            alertsToday: todayResult[0].count,
            lastAlert: lastAlertResult.length > 0 ? lastAlertResult[0].timestamp : null,
            avgGasLevel: Math.round(statsResult[0].avg_level || 0),
            maxGasLevel: statsResult[0].max_level || 0,
            minGasLevel: statsResult[0].min_level || 0,
            distribution: distribution
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching statistics', error: error.message });
    }
});

// ===== GET DAILY STATISTICS =====
router.get('/statistics/daily', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const result = await db.query(
            `SELECT DATE(timestamp) as date, COUNT(*) as total_incidents,
                SUM(CASE WHEN status = 'ALERT' THEN 1 ELSE 0 END) as alert_count,
                SUM(CASE WHEN status = 'NORMAL' THEN 1 ELSE 0 END) as normal_count,
                ROUND(AVG(gas_level), 2) as avg_gas_level, MAX(gas_level) as max_gas_level
            FROM incidents WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(timestamp) ORDER BY date DESC`, [days]
        );
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching daily statistics', error: error.message });
    }
});

module.exports = router;