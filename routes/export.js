const express = require('express');
const router = express.Router();
const db = require('../config/database');
require('express-validator');

// ===== EXPORT DATA =====
router.get('/incidents/export', async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const statusFilter = req.query.status;
        let sql = 'SELECT id, gas_level, status, timestamp, location FROM incidents WHERE 1=1';
        let params = [];
        if (statusFilter && statusFilter !== 'all') { sql += ' AND status = ?'; params.push(statusFilter); }
        sql += ' ORDER BY timestamp DESC';
        const results = await db.query(sql, params);

        if (format === 'csv') {
            const headers = ['ID', 'Gas Level (PPM)', 'Status', 'Timestamp', 'Location'];
            const rows = results.map(row => [row.id, row.gas_level, row.status, row.timestamp, row.location].join(','));
            const csvContent = [headers.join(','), ...rows].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=gas_incidents_${Date.now()}.csv`);
            return res.send(csvContent);
        }
        res.json({ success: true, data: results, count: results.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error exporting data', error: error.message });
    }
});

module.exports = router;