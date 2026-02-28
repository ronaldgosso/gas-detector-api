const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { body, validationResult } = require('express-validator');


// ===== GET ALL INCIDENTS WITH PAGINATION =====
router.get('/incidents', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const statusFilter = req.query.status;
        const search = req.query.search || '';

        let offset = (page - 1) * limit;
        let sql = 'SELECT * FROM incidents WHERE 1=1';
        let countSql = 'SELECT COUNT(*) as total FROM incidents WHERE 1=1';
        let params = [];

        if (statusFilter && statusFilter !== 'all') {
            sql += ' AND status = ?';
            countSql += ' AND status = ?';
            params.push(statusFilter);
        }

        if (search) {
            sql += ' AND (gas_level LIKE ? OR location LIKE ? OR status LIKE ?)';
            countSql += ' AND (gas_level LIKE ? OR location LIKE ? OR status LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        const [countResult] = await db.pool.query(countSql, params);
        const total = countResult[0].total;

        sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const results = await db.query(sql, params);

        res.json({
            success: true,
            incidents: results,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching incidents', error: error.message });
    }
});

// ===== GET INCIDENT BY ID =====
router.get('/incidents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM incidents WHERE id = ?', [id]);
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'Incident not found' });
        }
        res.json({ success: true, data: result[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching incident', error: error.message });
    }
});

// ===== CREATE NEW INCIDENT (with SMS alert) =====
router.post('/incidents', [
    body('gas_level').isInt({ min: 0, max: 1023 }).withMessage('Gas level must be between 0 and 1023'),
    body('status').isIn(['NORMAL', 'ALERT']).withMessage('Status must be NORMAL or ALERT'),
    body('location').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { gas_level, status, location = 'Main Sensor', sensor_id = 'SENSOR_001' } = req.body;

        const result = await db.query(
            'INSERT INTO incidents (gas_level, status, location, sensor_id) VALUES (?, ?, ?, ?)',
            [gas_level, status, location, sensor_id]
        );

        const newIncident = await db.query('SELECT * FROM incidents WHERE id = ?', [result.insertId]);

        // ============ SMS ALERT LOGIC ============
        if (status === 'ALERT' && gas_level > 800) {
            try {
                const nextsms = require('../services/nextsms-service');

                // Honor the sms_contact_id setting
                const [prefResult] = await db.pool.query(
                    'SELECT setting_value FROM settings WHERE setting_key = "sms_contact_id"'
                );
                const smsContactId = prefResult.length > 0 ? prefResult[0].setting_value : '0';

                let contacts = [];
                if (smsContactId === '0') {
                    const [allActive] = await db.pool.query(
                        'SELECT phone_number, contact_name FROM emergency_contacts WHERE is_active = TRUE'
                    );
                    contacts = allActive;
                } else {
                    const [selected] = await db.pool.query(
                        'SELECT phone_number, contact_name FROM emergency_contacts WHERE id = ? AND is_active = TRUE',
                        [smsContactId]
                    );
                    contacts = selected;
                }

                if (contacts.length > 0) {
                    nextsms.sendAlert(gas_level, location, contacts)
                        .catch(err => console.error('SMS background error:', err));
                }
            } catch (smsError) {
                console.error('SMS integration error:', smsError.message);
            }
        }
        // ============ END SMS LOGIC ============

        res.status(201).json({ success: true, data: newIncident[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating incident', error: error.message });
    }
});

// ===== UPDATE INCIDENT =====
router.put('/incidents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { gas_level, status, location } = req.body;
        let sql = 'UPDATE incidents SET ';
        let params = [];
        if (gas_level !== undefined) { sql += 'gas_level = ?, '; params.push(gas_level); }
        if (status !== undefined) { sql += 'status = ?, '; params.push(status); }
        if (location !== undefined) { sql += 'location = ?, '; params.push(location); }
        sql = sql.slice(0, -2);
        sql += ' WHERE id = ?';
        params.push(id);
        const result = await db.query(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Incident not found' });
        }
        res.json({ success: true, message: 'Incident updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating incident', error: error.message });
    }
});

// ===== DELETE INCIDENT =====
router.delete('/incidents/:id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM incidents WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Incident not found' });
        }
        res.json({ success: true, message: 'Incident deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting incident', error: error.message });
    }
});

// ===== CLEAR ALL INCIDENTS =====
router.delete('/incidents/clear', async (req, res) => {
    try {
        await db.query('DELETE FROM incidents');
        await db.query('ALTER TABLE incidents AUTO_INCREMENT = 1');
        res.json({ success: true, message: 'All incidents cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error clearing incidents', error: error.message });
    }
});

module.exports = router;