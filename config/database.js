require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gas_monitor_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`Database: ${dbConfig.database}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        console.error('Please ensure XAMPP MySQL is running');
        console.error('Check your .env file for correct credentials');
        return false;
    }
}

// Execute query helper
async function query(sql, params) {
    const connection = await pool.getConnection();
    try {
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Query error:', error.message);
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