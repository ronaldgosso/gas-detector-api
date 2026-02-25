require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./config/database');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===== STATIC FILES =====
app.use(express.static('public'));

// ===== API ROUTES =====
app.use('/api', apiRoutes);

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Gas Leak Detection System API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            sensor: '/api/sensor/latest',
            incidents: '/api/incidents',
            statistics: '/api/statistics',
            settings: '/api/settings',
            logs: '/api/logs',
            bluetooth: '/api/bluetooth/status',
            chart: '/api/chart/data'
        },
        documentation: 'See project documentation for full API details'
    });
});

// ===== ERROR HANDLING =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ===== START SERVER =====
async function startServer() {
    try {
        // Test database connection
        const dbConnected = await db.testConnection();
        
        if (!dbConnected) {
            console.error('Cannot start server without database connection');
            process.exit(1);
        }
        
        // Start server
        app.listen(PORT, () => {
            console.log('Server running at:', `http://localhost:${PORT}`);
            console.log('API Base URL:', `http://localhost:${PORT}/api`);
            console.log('Available endpoints:');
            console.log('   • GET  /api/health              - Health check');
            console.log('   • GET  /api/sensor/latest       - Latest sensor reading');
            console.log('   • GET  /api/incidents           - List all incidents');
            console.log('   • POST /api/incidents           - Create new incident');
            console.log('   • GET  /api/statistics          - System statistics');
            console.log('   • GET  /api/chart/data          - Chart data for dashboard');
            console.log('   • GET  /api/incidents/export    - Export data (JSON/CSV/XML)');
            console.log('   • GET  /api/settings            - Get system settings');
            console.log('   • GET  /api/logs                - System logs');
            console.log('   • GET  /api/bluetooth/status    - Bluetooth connection status');
            console.log('   • GET  /api/statistics/daily    - Daily statistics');
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

// Start the server
startServer();