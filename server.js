require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./config/database');
const apiRoutes = require('./routes/api');
const emergencyContactRoutes = require('./routes/emergency-contact');
const settingsService = require('./services/settings-service');

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===== STATIC FILES =====
app.use(express.static('public'));

// ===== API ROUTES =====
app.use('/api', apiRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);

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
            chart: '/api/chart/',
            emergencyContact: '/api/emergency-contact'
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

        // Fetch port from DB
        const apiEndpoint = await settingsService.getApiEndpoint();
        console.log(`🔍 Dynamic API Endpoint: "${apiEndpoint}"`);
        let port = 3000;
        try {
            const url = new URL(apiEndpoint);
            port = url.port || (url.protocol === 'https:' ? 443 : 80);
            console.log(`🌐 Parsed Port: ${port}`);
        } catch (e) {
            console.warn(`⚠️ Invalid API_ENDPOINT_URL in DB: "${apiEndpoint}". Falling back to port 3000.`);
        }

        // Start server
        app.listen(port, () => {
            console.log('Server running at:', `http://localhost:${port}`);
            console.log('API Base URL:', `http://localhost:${port}/api`);
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