require('dotenv').config();
const SerialPort = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const mysql = require('mysql2/promise');

// ===== CONFIGURATION =====
const BLUETOOTH_PORT = process.env.BLUETOOTH_PORT || 'COM5';
const BAUD_RATE = parseInt(process.env.BLUETOOTH_BAUD_RATE) || 9600;
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gas_monitor_db'
};

// ===== DATABASE CONNECTION =====
let dbConnection;

async function initDatabase() {
    try {
        dbConnection = await mysql.createConnection(DB_CONFIG);
        console.log('Database connected successfully');
        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return false;
    }
}

// ===== INSERT INCIDENT INTO DATABASE =====
async function logIncident(gasLevel, status) {
    try {
        const [result] = await dbConnection.execute(
            'INSERT INTO incidents (gas_level, status, location) VALUES (?, ?, ?)',
            [gasLevel, status, 'Main Sensor']
        );
        
        // Update Bluetooth connection status
        await dbConnection.execute(
            `UPDATE bluetooth_connections 
             SET status = 'connected', last_connected = NOW() 
             WHERE port = ?`,
            [BLUETOOTH_PORT]
        );
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}]  Logged: Level=${gasLevel}, Status=${status}, ID=${result.insertId}`);
        
        return true;
    } catch (error) {
        console.error('Error logging incident:', error.message);
        return false;
    }
}

// ===== BLUETOOTH RECEIVER =====
async function startBluetoothReceiver() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   📡 GAS LEAK DETECTION - BLUETOOTH RECEIVER             ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log('📡 Configuration:');
    console.log(`   • Bluetooth Port: ${BLUETOOTH_PORT}`);
    console.log(`   • Baud Rate: ${BAUD_RATE}`);
    console.log(`   • Database: ${DB_CONFIG.database}@${DB_CONFIG.host}`);
    console.log('\n⏳ Initializing...\n');
    
    // Initialize database
    const dbReady = await initDatabase();
    if (!dbReady) {
        console.error('Cannot start without database connection');
        process.exit(1);
    }
    
    try {
        // Open serial port
        const port = new SerialPort({
            path: BLUETOOTH_PORT,
            baudRate: BAUD_RATE
        });
        
        const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
        
        console.log('✅ Bluetooth receiver started successfully!\n');
        console.log('📊 Listening for sensor data...\n');
        
        // Handle incoming data
        parser.on('data', async (data) => {
            const line = data.trim();
            
            // Parse data format: GAS:<value>,<status>
            if (line.startsWith('GAS:')) {
                try {
                    const parts = line.replace('GAS:', '').split(',');
                    const gasLevel = parseInt(parts[0]);
                    const status = parts[1] || 'UNKNOWN';
                    
                    if (!isNaN(gasLevel)) {
                        await logIncident(gasLevel, status);
                    }
                } catch (parseError) {
                    console.error('❌ Parse error:', parseError.message);
                }
            }
        });
        
        // Handle port errors
        port.on('error', (error) => {
            console.error('❌ Serial port error:', error.message);
            
            // Update Bluetooth status in database
            dbConnection.execute(
                `UPDATE bluetooth_connections 
                 SET status = 'error', last_disconnected = NOW() 
                 WHERE port = ?`,
                [BLUETOOTH_PORT]
            );
        });
        
        // Handle port close
        port.on('close', () => {
            console.log('\n⚠️  Bluetooth connection closed');
            
            // Update Bluetooth status in database
            dbConnection.execute(
                `UPDATE bluetooth_connections 
                 SET status = 'disconnected', last_disconnected = NOW() 
                 WHERE port = ?`,
                [BLUETOOTH_PORT]
            );
        });
        
    } catch (error) {
        console.error('❌ Failed to open serial port:', error.message);
        console.error('\n💡 Troubleshooting tips:');
        console.error('   1. Make sure HC-05 is paired with your computer');
        console.error('   2. Check Device Manager for correct COM port');
        console.error('   3. Ensure no other program is using the COM port');
        console.error('   4. Verify HC-05 is powered and LED is blinking');
        
        // Update Bluetooth status in database
        if (dbConnection) {
            await dbConnection.execute(
                `UPDATE bluetooth_connections 
                 SET status = 'error', last_disconnected = NOW() 
                 WHERE port = ?`,
                [BLUETOOTH_PORT]
            );
        }
        
        process.exit(1);
    }
}

// ===== HANDLE SHUTDOWN =====
process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutdown signal received');
    if (dbConnection) {
        await dbConnection.end();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n🛑 Interrupt signal received');
    if (dbConnection) {
        await dbConnection.end();
    }
    process.exit(0);
});

// ===== START RECEIVER =====
startBluetoothReceiver();