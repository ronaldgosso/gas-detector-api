const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get emergency contact
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT phone_number, contact_name, is_active FROM emergency_contacts WHERE is_active = TRUE LIMIT 1'
        );

        if (result.length === 0) {
            return res.json({ success: false, message: 'No emergency contact configured' });
        }

        res.json({
            success: true,
            data: result[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching emergency contact',
            error: error.message
        });
    }
});

// Save/update emergency contact
router.post('/', async (req, res) => {
    try {
        const { phone_number, contact_name = 'Emergency Contact' } = req.body;

        if (!phone_number || !/^\+255[0-9]{9}$/.test(phone_number)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format. Use +255XXXXXXXXX'
            });
        }

        // Upsert contact (insert or update)
        const result = await db.query(
            `INSERT INTO emergency_contacts (phone_number, contact_name, is_active) 
             VALUES (?, ?, TRUE)
             ON DUPLICATE KEY UPDATE 
                contact_name = VALUES(contact_name),
                is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP`,
            [phone_number, contact_name]
        );

        res.json({
            success: true,
            message: 'Emergency contact saved successfully',
            contact_id: result.insertId || 'existing'
        });
    } catch (error) {
        console.error('Emergency contact save error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save emergency contact',
            error: error.message
        });
    }
});

// Delete emergency contact
router.delete('/:id', async (req, res) => {
    try {
        await db.query(
            'UPDATE emergency_contacts SET is_active = FALSE WHERE id = ?',
            [req.params.id]
        );

        res.json({
            success: true,
            message: 'Emergency contact deactivated'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete contact',
            error: error.message
        });
    }
});

module.exports = router;