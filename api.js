const express = require('express');
const router = express.Router();
const db = require('./database');
const { body, validationResult } = require('express-validator');

// ==========================================
// API ENDPOINTS
// ==========================================

// ===== HEALTH CHECK =====
router.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT 1');
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

    const countResult = await db.query(countSql, params);
    const total = countResult[0].total;

    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const results = await db.query(sql, params);

    res.json({
      success: true,
      data: {
        incidents: results,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching incidents',
      error: error.message
    });
  }
});

// ===== GET INCIDENT BY ID =====
router.get('/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM incidents WHERE id = ?', [id]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching incident',
      error: error.message
    });
  }
});

// ===== CREATE NEW INCIDENT (Mobile & Bluetooth) =====
router.post('/incidents', [
  body('gas_level').isInt({ min: 0, max: 1023 }).withMessage('Gas level must be between 0 and 1023'),
  body('status').isIn(['NORMAL', 'ALERT']).withMessage('Status must be NORMAL or ALERT'),
  body('location').optional().isString(),
  body('sensor_id').optional().isString()
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { gas_level, status, location = 'Mobile Sensor', sensor_id = 'MOBILE_001' } = req.body;

    // Insert new incident
    const result = await db.query(
      'INSERT INTO incidents (gas_level, status, location, sensor_id) VALUES (?, ?, ?, ?)',
      [gas_level, status, location, sensor_id]
    );

    // Get the inserted record
    const newIncident = await db.query(
      'SELECT * FROM incidents WHERE id = ?',
      [result.insertId]
    );

    // ============ SMS ALERT LOGIC (Critical Threshold) ============
    // ONLY trigger SMS if gas_level > 800 PPM (mobile app should handle averaging)
    if (status === 'ALERT' && gas_level > 800) {
      try {
        // Get SMS contact preference
        const prefResult = await db.query(
          'SELECT setting_value FROM settings WHERE setting_key = ?',
          ['sms_contact_id']
        );

        const smsContactId = prefResult.length > 0 ? prefResult[0].setting_value : '0';
        let contacts = [];

        if (smsContactId === '0') {
          // Send to all active contacts
          const allActive = await db.query(
            'SELECT phone_number, contact_name FROM emergency_contacts WHERE is_active = TRUE'
          );
          contacts = allActive;
        } else {
          // Send to specific contact
          const selected = await db.query(
            'SELECT phone_number, contact_name FROM emergency_contacts WHERE id = ? AND is_active = TRUE',
            [smsContactId]
          );
          contacts = selected;
        }

        if (contacts.length > 0) {
          // TODO: Integrate with NextSMS service here
          console.log(`📱 SMS TRIGGERED for ${gas_level} PPM to ${contacts.length} contact(s)`);

          // Example integration (uncomment when NextSMS service is ready):
          /*
          const nextsms = require('../services/nextsms-service');
          await nextsms.sendAlert(gas_level, location, contacts);
          */
        }
      } catch (smsError) {
        console.error('SMS integration error:', smsError.message);
        // Never fail the API request due to SMS issues
      }
    }
    // ============ END SMS LOGIC ============

    res.status(201).json({
      success: true,
      data: newIncident[0],
      message: 'Incident logged successfully'
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating incident',
      error: error.message
    });
  }
});

// ===== UPDATE INCIDENT =====
router.put('/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { gas_level, status, location } = req.body;

    let sql = 'UPDATE incidents SET ';
    let params = [];

    if (gas_level !== undefined) {
      sql += 'gas_level = ?, ';
      params.push(gas_level);
    }
    if (status !== undefined) {
      sql += 'status = ?, ';
      params.push(status);
    }
    if (location !== undefined) {
      sql += 'location = ?, ';
      params.push(location);
    }

    // Remove trailing comma and space
    sql = sql.slice(0, -2);
    sql += ' WHERE id = ?';
    params.push(id);

    const result = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      message: 'Incident updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating incident',
      error: error.message
    });
  }
});

// ===== DELETE INCIDENT =====
router.delete('/incidents/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM incidents WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      message: 'Incident deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting incident',
      error: error.message
    });
  }
});

// ===== CLEAR ALL INCIDENTS =====
router.delete('/incidents/clear', async (req, res) => {
  try {
    await db.query('DELETE FROM incidents');
    await db.query('ALTER TABLE incidents AUTO_INCREMENT = 1');

    res.json({
      success: true,
      message: 'All incidents cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing incidents',
      error: error.message
    });
  }
});

// ===== GET STATISTICS =====
router.get('/statistics', async (req, res) => {
  try {
    const totalResult = await db.query('SELECT COUNT(*) as total FROM incidents');
    const todayResult = await db.query(
      "SELECT COUNT(*) as count FROM incidents WHERE status = 'ALERT' AND DATE(timestamp) = CURDATE()"
    );
    const lastAlertResult = await db.query(
      "SELECT timestamp FROM incidents WHERE status = 'ALERT' ORDER BY timestamp DESC LIMIT 1"
    );
    const statsResult = await db.query(
      'SELECT AVG(gas_level) as avg_level, MAX(gas_level) as max_level, MIN(gas_level) as min_level FROM incidents'
    );
    const distributionResult = await db.query(
      "SELECT status, COUNT(*) as count FROM incidents GROUP BY status"
    );

    const distribution = {};
    distributionResult.forEach(row => {
      distribution[row.status] = row.count;
    });

    res.json({
      success: true,
      data: {
        totalRecords: totalResult[0].total,
        alertsToday: todayResult[0].count,
        lastAlert: lastAlertResult.length > 0 ? lastAlertResult[0].timestamp : null,
        avgGasLevel: Math.round(statsResult[0].avg_level || 0),
        maxGasLevel: statsResult[0].max_level || 0,
        minGasLevel: statsResult[0].min_level || 0,
        distribution: distribution
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// ===== EXPORT DATA =====
router.get('/incidents/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const statusFilter = req.query.status;

    let sql = 'SELECT id, gas_level, status, timestamp, location FROM incidents WHERE 1=1';
    let params = [];

    if (statusFilter && statusFilter !== 'all') {
      sql += ' AND status = ?';
      params.push(statusFilter);
    }

    sql += ' ORDER BY timestamp DESC';
    const results = await db.query(sql, params);

    if (format === 'csv') {
      const headers = ['ID', 'Gas Level (PPM)', 'Status', 'Timestamp', 'Location'];
      const rows = results.map(row =>
        [row.id, row.gas_level, row.status, row.timestamp, row.location].join(',')
      );
      const csvContent = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=gas_incidents_${Date.now()}.csv`);
      return res.send(csvContent);
    }

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: error.message
    });
  }
});

// ===== GET SYSTEM SETTINGS =====
router.get('/settings', async (req, res) => {
  try {
    const result = await db.query('SELECT setting_key, setting_value, description FROM settings');
    const settings = {};
    result.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
});

// ===== UPDATE SYSTEM SETTINGS =====
router.post('/settings', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings format'
      });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
        [value.toString(), key]
      );
    }

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
});

// ===== GET SYSTEM LOGS =====
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type;

    let sql = 'SELECT * FROM system_logs WHERE 1=1';
    let params = [];

    if (type && type !== 'all') {
      sql += ' AND log_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const results = await db.query(sql, params);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching logs',
      error: error.message
    });
  }
});

// ===== GET BLUETOOTH STATUS =====
router.get('/bluetooth/status', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM bluetooth_connections ORDER BY last_connected DESC LIMIT 1'
    );

    res.json({
      success: true,
      data: result.length > 0 ? result[0] : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching Bluetooth status',
      error: error.message
    });
  }
});

// ===== UPDATE BLUETOOTH STATUS =====
router.post('/bluetooth/status', async (req, res) => {
  try {
    const { device_name, mac_address, port, status } = req.body;

    await db.query(
      `INSERT INTO bluetooth_connections (device_name, mac_address, port, status, last_connected) 
       VALUES (?, ?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE status = ?, last_connected = NOW()`,
      [device_name, mac_address, port, status, status]
    );

    res.json({
      success: true,
      message: 'Bluetooth status updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating Bluetooth status',
      error: error.message
    });
  }
});

// ===== GET DAILY STATISTICS =====
router.get('/statistics/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await db.query(
      `SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total_incidents,
        SUM(CASE WHEN status = 'ALERT' THEN 1 ELSE 0 END) as alert_count,
        SUM(CASE WHEN status = 'NORMAL' THEN 1 ELSE 0 END) as normal_count,
        ROUND(AVG(gas_level), 2) as avg_gas_level,
        MAX(gas_level) as max_gas_level
      FROM incidents 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date DESC`,
      [days]
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching daily statistics',
      error: error.message
    });
  }
});

// ===== GET REAL-TIME CHART DATA =====
router.get('/chart/data', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await db.query(
      'SELECT id, gas_level, status, timestamp FROM incidents ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );

    // Reverse to show chronological order (oldest first)
    result.reverse();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching chart data',
      error: error.message
    });
  }
});

module.exports = router;