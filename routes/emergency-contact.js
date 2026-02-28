const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all active emergency contacts
router.get('/list', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, phone_number, contact_name, is_active FROM emergency_contacts WHERE is_active = TRUE ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching contacts', 
      error: error.message 
    });
  }
});

// Get primary/latest emergency contact
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, phone_number, contact_name, is_active FROM emergency_contacts WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (result.length === 0) {
      return res.json({ 
        success: false, 
        message: 'No emergency contact configured' 
      });
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

// Add/Update emergency contact
router.post('/', async (req, res) => {
  try {
    const { phone_number, contact_name = 'Emergency Contact' } = req.body;
    
    if (!phone_number || !/^\+255[0-9]{9}$/.test(phone_number.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use +255XXXXXXXXX'
      });
    }

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
      data: { 
        id: result.insertId || 'existing', 
        phone_number, 
        contact_name 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save emergency contact', 
      error: error.message 
    });
  }
});

// Deactivate emergency contact (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid contact ID' 
      });
    }

    const result = await db.query(
      'UPDATE emergency_contacts SET is_active = FALSE WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contact not found or already deactivated' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Emergency contact deactivated successfully' 
    });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while deactivating contact' 
    });
  }
});

// Get selected SMS contact setting
router.get('/settings/sms-selection', async (req, res) => {
  try {
    // FIX: Use db.query instead of db.pool.query
    const result = await db.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['sms_contact_id']
    );
    
    const contactId = result.length > 0 ? result[0].setting_value : '0';

    if (contactId !== '0') {
      const contact = await db.query(
        'SELECT id, phone_number, contact_name FROM emergency_contacts WHERE id = ? AND is_active = TRUE',
        [contactId]
      );

      if (contact.length > 0) {
        return res.json({ 
          success: true, 
          data: contact[0], 
          isMultiple: false 
        });
      }
    }

    // Get all active contacts if no specific selection
    const allContacts = await db.query(
      'SELECT id, phone_number, contact_name FROM emergency_contacts WHERE is_active = TRUE'
    );
    
    res.json({ 
      success: true, 
      data: allContacts, 
      isMultiple: true 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching SMS selection', 
      error: error.message 
    });
  }
});

// Update selected SMS contact setting
router.put('/settings/sms-selection', async (req, res) => {
  try {
    const { contact_id } = req.body;
    
    if (contact_id === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contact ID is required' 
      });
    }

    await db.query(
      'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
      [String(contact_id), 'sms_contact_id']
    );

    res.json({ 
      success: true, 
      message: 'SMS selection updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating SMS selection', 
      error: error.message 
    });
  }
});

module.exports = router;