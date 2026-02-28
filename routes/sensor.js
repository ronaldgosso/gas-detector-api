const express = require('express');
const router = express.Router();
const db = require('../config/database');


// ===== GET LATEST SENSOR DATA =====
router.get('/sensor/latest', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 1'
        );

        if (result.length === 0) {
            return res.json({
                success: true,
                data: {
                    gas_level: 0,
                    status: 'NORMAL',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({
            success: true,
            data: result[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching latest sensor data',
            error: error.message
        });
    }
});

module.exports = router;