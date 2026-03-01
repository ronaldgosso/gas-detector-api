const https = require('https');
const settingsService = require('./settings-service');

class NextSMSService {
  constructor() {
    this.apiToken = process.env.NEXTSMS_API_KEY || '';
    this.senderId = process.env.NEXTSMS_SENDER_ID || 'GasMonitor';
    this.cooldownSeconds = parseInt(process.env.SMS_COOLDOWN_SECONDS) || 30;
    this.baseUrl = process.env.NEXTSMS_BASE_URL || 'https://api.nextsms.co.tz';

    // In-memory cooldown tracking: Map<phoneNumber, lastSentTimestamp>
    this.cooldownMap = new Map();

    if (!this.apiToken) {
      console.warn('⚠️ NEXTSMS_API_KEY not configured. SMS alerts disabled.');
    }
  }

  // Check if SMS can be sent (respect 30-second cooldown)
  canSendSMS(phoneNumber) {
    if (!this.apiToken) return false;

    const lastSent = this.cooldownMap.get(phoneNumber);
    if (!lastSent) return true;

    const elapsedSeconds = (Date.now() - lastSent.getTime()) / 1000;
    return elapsedSeconds >= this.cooldownSeconds;
  }

  // Record SMS sent timestamp
  recordSMSSent(phoneNumber) {
    this.cooldownMap.set(phoneNumber, new Date());
    console.log(`📱 SMS cooldown activated for ${phoneNumber} (${this.cooldownSeconds}s)`);
  }

  // Send gas alert SMS to contacts
  async sendAlert(gasLevel, location, contacts) {
    // Skip if no API token
    if (!this.apiToken) {
      console.log('⏭️ SMS skipped: NEXTSMS_API_KEY not configured');
      return false;
    }

    // Fetch threshold from DB
    const threshold = await settingsService.getGasThreshold();

    // Skip if below threshold
    if (gasLevel < threshold) {
      console.log(`⏭️ SMS skipped: ${gasLevel} PPM < ${threshold} PPM threshold`);
      return false;
    }

    // Filter eligible contacts (respect cooldown)
    const eligible = contacts.filter(c =>
      c.phone_number && this.canSendSMS(c.phone_number)
    );

    if (eligible.length === 0) {
      console.log(`⏭️ SMS skipped: All contacts on cooldown`);
      return false;
    }

    // Format recipients (+255 format)
    const recipients = eligible.map(c =>
      c.phone_number.startsWith('+') ? c.phone_number : `+${c.phone_number}`
    );

    // Format urgent message
    const message = `🚨 CRITICAL GAS LEAK!\n📍 ${location}\n📊 ${gasLevel} PPM\n⚠️ EVACUATE IMMEDIATELY!\n${new Date().toLocaleString('sw-TZ')}`;

    try {
      console.log(`📤 Sending SMS to ${recipients.length} contact(s): ${recipients.join(', ')}`);

      const success = await this._sendRaw(message, recipients);

      if (success) {
        recipients.forEach(p => this.recordSMSSent(p));
        console.log(`✅ SMS alert sent successfully`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ SMS failed:', error.message);
      return false;
    }
  }

  // Internal HTTP request to NextSMS API
  _sendRaw(message, recipients) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        "from": this.senderId,
        "to": recipients,
        "text": message,
        "flash": 0,
        "reference": "gasAlertxcftz"
      });

      const options = {
        hostname: this.baseUrl,
        path: '/api/sms/v2/text/single',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.status === 'success') {
              resolve(true);
            } else {
              console.error('NextSMS error:', json.message || body);
              resolve(false);
            }
          } catch (e) {
            console.error('NextSMS parse error:', body);
            resolve(false);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

module.exports = new NextSMSService();