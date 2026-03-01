require('dotenv').config();
const SerialPort = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const mysql = require('mysql2/promise');
const settingsService = require('./settings-service');

// ===== CONFIGURATION =====
// Replaced hardcoded defaults with dynamic fetching in init
let BLUETOOTH_PORT = 'COM5';
let BAUD_RATE = 9600;
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 60000; // 60 seconds (consider connection dead if no data)

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gas_monitor_db',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
};

// ===== STATE MANAGEMENT =====
let dbConnection = null;
let serialPort = null;
let parser = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let lastDataReceived = Date.now();
let heartbeatTimer = null;
let isShuttingDown = false;

// Re-fetch port on reconnect if needed
async function refreshConfig() {
  BLUETOOTH_PORT = await settingsService.getBluetoothPort();
  const baud = await settingsService.getSetting('bluetooth_baud_rate', '9600');
  BAUD_RATE = parseInt(baud);
  console.log(`⚙️  Current Config: Port=${BLUETOOTH_PORT}, Baud=${BAUD_RATE}`);
}

// ===== DATABASE CONNECTION =====
async function initDatabase() {
  try {
    await refreshConfig();
    if (dbConnection) {
      // Test existing connection
      await dbConnection.query('SELECT 1');
      console.log('✅ Database connection verified');
      return true;
    }

    dbConnection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Database connected successfully');

    // Setup connection error handler
    dbConnection.on('error', (err) => {
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.warn('⚠️ Database connection lost. Will reconnect on next operation.');
        dbConnection = null;
      } else if (err.code !== 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
        console.error('❌ Database error:', err.message);
      }
    });

    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    dbConnection = null;
    return false;
  }
}

// Retry database operation with exponential backoff
async function withDbRetry(operation, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (!dbConnection) {
        await initDatabase();
      }
      return await operation();
    } catch (error) {
      lastError = error;

      // Only retry on connection errors
      if (error.code !== 'PROTOCOL_CONNECTION_LOST' &&
        error.code !== 'ECONNREFUSED' &&
        error.code !== 'ER_CON_COUNT_ERROR') {
        throw error;
      }

      console.warn(`⚠️ Database operation failed (attempt ${i + 1}/${maxRetries}). Retrying...`);
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 5000)));
    }
  }

  throw lastError;
}

// ===== INSERT INCIDENT INTO DATABASE =====
async function logIncident(gasLevel, status, location = 'Main Sensor') {
  try {
    await withDbRetry(async () => {
      const [result] = await dbConnection.execute(
        'INSERT INTO incidents (gas_level, status, location) VALUES (?, ?, ?)',
        [gasLevel, status, location]
      );

      // Update Bluetooth connection status
      await dbConnection.execute(
        `UPDATE bluetooth_connections 
         SET status = 'connected', last_connected = NOW() 
         WHERE port = ?`,
        [BLUETOOTH_PORT]
      );

      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ✅ Logged: Level=${gasLevel}, Status=${status}, ID=${result.insertId}`);
      return result;
    });
  } catch (error) {
    console.error('❌ Error logging incident:', error.message);

    // Attempt to update connection status even on failure
    try {
      await withDbRetry(async () => {
        await dbConnection.execute(
          `UPDATE bluetooth_connections 
           SET status = 'error', last_disconnected = NOW() 
           WHERE port = ?`,
          [BLUETOOTH_PORT]
        );
      });
    } catch (dbError) {
      console.error('⚠️ Failed to update connection status:', dbError.message);
    }

    return null;
  }
}

// ===== BLUETOOTH CONNECTION MANAGEMENT =====
async function connectBluetooth() {
  if (isShuttingDown) return;

  try {
    // Close existing connection if open
    if (serialPort) {
      try {
        await new Promise((resolve, reject) => {
          serialPort.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (err) {
        console.warn('⚠️ Error closing existing port:', err.message);
      }
      serialPort = null;
      parser = null;
    }

    console.log(`📡 Attempting to connect to Bluetooth device on ${BLUETOOTH_PORT}...`);

    // Open serial port
    serialPort = new SerialPort({
      path: BLUETOOTH_PORT,
      baudRate: BAUD_RATE,
      autoOpen: false
    });

    // Setup error handlers BEFORE opening
    serialPort.on('error', (error) => {
      console.error('❌ Serial port error:', error.message);
      scheduleReconnect(`Port error: ${error.message}`);
    });

    serialPort.on('close', () => {
      if (!isShuttingDown) {
        console.warn('⚠️ Bluetooth connection closed unexpectedly');
        scheduleReconnect('Port closed');
      }
    });

    // Open port with timeout
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Port open timeout after 5 seconds'));
      }, 5000);

      serialPort.open((err) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve();
      });
    });

    // Setup parser
    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    // Data handler
    parser.on('data', async (data) => {
      lastDataReceived = Date.now();

      const line = data.trim();

      // Parse data format: GAS:<value>,<status>
      if (line.startsWith('GAS:')) {
        try {
          const parts = line.replace('GAS:', '').split(',');
          const gasLevel = parseInt(parts[0]);
          const status = parts[1] || 'UNKNOWN';

          if (!isNaN(gasLevel) && gasLevel >= 0 && gasLevel <= 1023) {
            await logIncident(gasLevel, status);
          } else {
            console.warn(`⚠️ Invalid gas level received: ${gasLevel}`);
          }
        } catch (parseError) {
          console.error('❌ Parse error:', parseError.message, '| Raw data:', line);
        }
      } else if (line) {
        console.debug(`📡 Received non-GAS data: "${line}"`);
      }
    });

    // Reset reconnect state
    reconnectAttempts = 0;
    reconnectTimer = null;

    // Start heartbeat monitoring
    startHeartbeatMonitor();

    console.log('✅ Bluetooth receiver connected and listening!');
    console.log(`📊 Receiving data from ${BLUETOOTH_PORT} at ${BAUD_RATE} baud...\n`);

    // Update connection status in database
    await withDbRetry(async () => {
      await dbConnection.execute(
        `INSERT INTO bluetooth_connections 
         (device_name, port, status, last_connected) 
         VALUES (?, ?, 'connected', NOW())
         ON DUPLICATE KEY UPDATE 
           status = 'connected',
           last_connected = NOW()`,
        ['HC-05 Gas Sensor', BLUETOOTH_PORT]
      );
    });

  } catch (error) {
    console.error('❌ Failed to connect to Bluetooth device:', error.message);

    // Update connection status in database
    try {
      await withDbRetry(async () => {
        await dbConnection.execute(
          `INSERT INTO bluetooth_connections 
           (device_name, port, status, last_disconnected) 
           VALUES (?, ?, 'error', NOW())
           ON DUPLICATE KEY UPDATE 
             status = 'error',
             last_disconnected = NOW()`,
          ['HC-05 Gas Sensor', BLUETOOTH_PORT]
        );
      });
    } catch (dbError) {
      console.error('⚠️ Failed to update connection status:', dbError.message);
    }

    scheduleReconnect(`Connection failed: ${error.message}`);
  }
}

function scheduleReconnect(reason) {
  if (isShuttingDown || reconnectTimer) return;

  reconnectAttempts++;
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1),
    MAX_RECONNECT_DELAY
  );

  console.log(`\n⚠️ ${reason}`);
  console.log(`🔄 Reconnect attempt #${reconnectAttempts} in ${delay / 1000} seconds...\n`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!isShuttingDown && reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
      connectBluetooth();
    } else if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      console.error(`❌ Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. System halted.`);
      process.exit(1);
    }
  }, delay);
}

function startHeartbeatMonitor() {
  // Clear existing timer
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(() => {
    const timeSinceLastData = Date.now() - lastDataReceived;

    if (timeSinceLastData > HEARTBEAT_TIMEOUT && serialPort && serialPort.isOpen) {
      console.warn(`⚠️ No data received for ${timeSinceLastData / 1000} seconds. Reconnecting...`);
      scheduleReconnect('Heartbeat timeout - no data received');
    }
  }, HEARTBEAT_TIMEOUT / 2);
}

// ===== CLEANUP & SHUTDOWN =====
async function cleanup() {
  isShuttingDown = true;

  console.log('\n🛑 Shutdown initiated. Cleaning up resources...');

  // Clear timers
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  // Close serial port
  if (serialPort && serialPort.isOpen) {
    try {
      await new Promise((resolve) => {
        serialPort.close(() => {
          console.log('✅ Bluetooth port closed');
          resolve();
        });
      });
    } catch (err) {
      console.warn('⚠️ Error closing serial port:', err.message);
    }
  }

  // Close database connection
  if (dbConnection) {
    try {
      await dbConnection.end();
      console.log('✅ Database connection closed');
    } catch (err) {
      console.warn('⚠️ Error closing database:', err.message);
    }
  }

  console.log('✨ Cleanup complete. Exiting...\n');
  process.exit(0);
}

// Handle process termination signals
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('exit', cleanup);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error.message);
  console.error(error.stack);
  cleanup();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  cleanup();
});

// ===== START RECEIVER =====
async function startBluetoothReceiver() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   📡 GAS LEAK DETECTION - BLUETOOTH RECEIVER (v2.0)      ║');
  console.log('║        [PRODUCTION READY WITH AUTO-RECOVERY]             ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('⚙️  Configuration:');
  console.log(`   • Bluetooth Port: ${BLUETOOTH_PORT}`);
  console.log(`   • Baud Rate: ${BAUD_RATE}`);
  console.log(`   • Database: ${DB_CONFIG.database}@${DB_CONFIG.host}`);
  console.log(`   • Reconnect Attempts: ${MAX_RECONNECT_ATTEMPTS} (max)`);
  console.log(`   • Heartbeat Timeout: ${HEARTBEAT_TIMEOUT / 1000}s`);
  console.log('\n⏳ Initializing...\n');

  // Initialize database first
  const dbReady = await initDatabase();
  if (!dbReady) {
    console.error('❌ Cannot start without database connection');
    process.exit(1);
  }

  // Start Bluetooth connection
  await connectBluetooth();
}

// Start the receiver
startBluetoothReceiver().catch(err => {
  console.error('💥 Fatal startup error:', err.message);
  process.exit(1);
});