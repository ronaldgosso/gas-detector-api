require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration with Aiven SSL support
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gas_monitor_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,

    // ===== CRITICAL AIVEN SSL CONFIGURATION =====
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
        // For production with CA cert:
        // ca: fs.readFileSync('./aiven-ca.pem')
    } : false,

    // MySQL 8.0 Authentication Plugin Fix
    authPlugins: {
        mysql_native_password: () => () => Buffer.from('')
    }
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`   Database: ${dbConfig.database}`);
        console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error(`   Message: ${error.message}`);
        console.error(`   Code: ${error.code}`);
        console.error(`   SQL State: ${error.sqlState}`);

        // Common Aiven errors with solutions
        if (error.code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
            console.error('\n💡 FIX: Update mysql2 package: npm install mysql2@latest');
        } else if (error.code === 'HANDSHAKE_SSL_ERROR') {
            console.error('\n💡 FIX: Set DB_SSL=true and DB_SSL_REJECT_UNAUTHORIZED=false in .env');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 FIX: Verify DB_HOST and DB_PORT in .env match Aiven credentials');
        }
        return false;
    }
}

// Execute query helper
async function query(sql, params) {
    const connection = await pool.getConnection();
    try {
        // Use query() instead of execute() to avoid prepared statement issues
        const [results] = await connection.query(sql, params);
        return results;
    } catch (error) {
        console.error('Query error:', error.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    pool,
    query,
    testConnection,
    config: dbConfig
};