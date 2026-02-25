-- ==========================================
-- GAS LEAK DETECTION SYSTEM - DATABASE SETUP
-- Compatible with XAMPP MySQL
-- ==========================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS gas_monitor_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE gas_monitor_db;

-- ==========================================
-- TABLE 1: Incidents (Main sensor data log)
-- ==========================================
CREATE TABLE IF NOT EXISTS incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gas_level INT NOT NULL COMMENT 'Gas concentration in PPM (0-1023)',
    status ENUM('NORMAL', 'ALERT') NOT NULL DEFAULT 'NORMAL',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(100) DEFAULT 'Main Sensor',
    sensor_id VARCHAR(50) DEFAULT 'SENSOR_001',
    INDEX idx_timestamp (timestamp),
    INDEX idx_status (status),
    INDEX idx_gas_level (gas_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Stores all gas leak incidents';

-- ==========================================
-- TABLE 2: System Settings
-- ==========================================
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='System configuration settings';

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('gas_threshold', '400', 'Gas level threshold for ALERT status (0-1023)'),
('refresh_interval', '2', 'Dashboard refresh interval in seconds'),
('bluetooth_port', 'COM5', 'Bluetooth COM port for HC-05 module'),
('bluetooth_baud_rate', '9600', 'Bluetooth baud rate'),
('theme_preference', 'light', 'Default theme: light or dark'),
('max_records', '10000', 'Maximum records to keep in database'),
('notification_email', '', 'Email for alert notifications'),
('created_at', NOW(), 'System initialization timestamp')
ON DUPLICATE KEY UPDATE setting_value=setting_value;

-- ==========================================
-- TABLE 3: Users (for future authentication)
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User accounts for dashboard access';

-- Insert default admin user (password: admin123)
-- Note: You'll need to hash the password properly before using
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@gasmonitor.local', '$2a$10$YourHashedPasswordHere', 'admin')
ON DUPLICATE KEY UPDATE username=username;

-- ==========================================
-- TABLE 4: System Logs
-- ==========================================
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_type ENUM('INFO', 'WARNING', 'ERROR', 'ALERT') NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(100) DEFAULT 'system',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_log_type (log_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='System activity and error logs';

-- ==========================================
-- TABLE 5: Bluetooth Connections
-- ==========================================
CREATE TABLE IF NOT EXISTS bluetooth_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    mac_address VARCHAR(17),
    port VARCHAR(20) NOT NULL,
    status ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
    last_connected DATETIME NULL,
    last_disconnected DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bluetooth device connection history';

-- Insert default HC-05 connection
INSERT INTO bluetooth_connections (device_name, mac_address, port, status) VALUES
('HC-05 Gas Sensor', '00:00:00:00:00:00', 'COM5', 'disconnected')
ON DUPLICATE KEY UPDATE device_name=device_name;

-- ==========================================
-- INSERT SAMPLE DATA FOR TESTING
-- ==========================================
-- Insert sample incidents (last 30 days)
-- Using correct DATE_SUB syntax for multiple intervals
INSERT INTO incidents (gas_level, status, timestamp, location) VALUES
-- Normal readings
(150, 'NORMAL', DATE_SUB(NOW(), INTERVAL 1 HOUR), 'Main Sensor'),
(180, 'NORMAL', DATE_SUB(NOW(), INTERVAL 2 HOUR), 'Main Sensor'),
(200, 'NORMAL', DATE_SUB(NOW(), INTERVAL 3 HOUR), 'Main Sensor'),
(175, 'NORMAL', DATE_SUB(NOW(), INTERVAL 4 HOUR), 'Main Sensor'),
(190, 'NORMAL', DATE_SUB(NOW(), INTERVAL 5 HOUR), 'Main Sensor'),
(210, 'NORMAL', DATE_SUB(NOW(), INTERVAL 6 HOUR), 'Main Sensor'),
(165, 'NORMAL', DATE_SUB(NOW(), INTERVAL 7 HOUR), 'Main Sensor'),
(185, 'NORMAL', DATE_SUB(NOW(), INTERVAL 8 HOUR), 'Main Sensor'),
(195, 'NORMAL', DATE_SUB(NOW(), INTERVAL 9 HOUR), 'Main Sensor'),
(170, 'NORMAL', DATE_SUB(NOW(), INTERVAL 10 HOUR), 'Main Sensor'),

-- Alert readings (yesterday)
(450, 'ALERT', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Main Sensor'),
(520, 'ALERT', DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 2 HOUR), 'Main Sensor'),
(480, 'ALERT', DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 4 HOUR), 'Main Sensor'),
(410, 'ALERT', DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 6 HOUR), 'Main Sensor'),
(430, 'ALERT', DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 8 HOUR), 'Main Sensor'),

-- Normal readings (2 days ago)
(160, 'NORMAL', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Main Sensor'),
(175, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 3 HOUR), 'Main Sensor'),
(185, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 6 HOUR), 'Main Sensor'),
(170, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 9 HOUR), 'Main Sensor'),
(190, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 12 HOUR), 'Main Sensor'),

-- Alert readings (3 days ago)
(470, 'ALERT', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Main Sensor'),
(510, 'ALERT', DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 4 HOUR), 'Main Sensor'),
(440, 'ALERT', DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 8 HOUR), 'Main Sensor'),

-- Normal readings (4 days ago)
(165, 'NORMAL', DATE_SUB(NOW(), INTERVAL 4 DAY), 'Main Sensor'),
(175, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 5 HOUR), 'Main Sensor'),
(180, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 10 HOUR), 'Main Sensor'),

-- Alert readings (5 days ago)
(460, 'ALERT', DATE_SUB(NOW(), INTERVAL 5 DAY), 'Main Sensor'),
(490, 'ALERT', DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 6 HOUR), 'Main Sensor'),

-- Recent readings (today)
(155, 'NORMAL', DATE_SUB(NOW(), INTERVAL 30 MINUTE), 'Main Sensor'),
(168, 'NORMAL', DATE_SUB(NOW(), INTERVAL 45 MINUTE), 'Main Sensor'),
(172, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 HOUR), INTERVAL 15 MINUTE), 'Main Sensor'),
(425, 'ALERT', DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 HOUR), INTERVAL 30 MINUTE), 'Main Sensor'),
(160, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 HOUR), INTERVAL 45 MINUTE), 'Main Sensor'),
(178, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 HOUR), INTERVAL 20 MINUTE), 'Main Sensor'),
(435, 'ALERT', DATE_SUB(DATE_SUB(NOW(), INTERVAL 7 HOUR), INTERVAL 10 MINUTE), 'Main Sensor'),
(170, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 8 HOUR), INTERVAL 40 MINUTE), 'Main Sensor'),
(182, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 10 HOUR), INTERVAL 5 MINUTE), 'Main Sensor'),
(165, 'NORMAL', DATE_SUB(DATE_SUB(NOW(), INTERVAL 11 HOUR), INTERVAL 30 MINUTE), 'Main Sensor')
ON DUPLICATE KEY UPDATE gas_level=gas_level;

-- Insert sample system logs
INSERT INTO system_logs (log_type, message, source) VALUES
('INFO', 'System started successfully', 'server'),
('INFO', 'Database connected', 'server'),
('ALERT', 'Gas leak detected - Level: 450 PPM', 'sensor'),
('INFO', 'Dashboard accessed', 'web'),
('WARNING', 'Bluetooth connection unstable', 'bluetooth'),
('ALERT', 'Gas leak detected - Level: 520 PPM', 'sensor'),
('INFO', 'Incident log cleared by admin', 'admin'),
('ERROR', 'Failed to read sensor data', 'sensor'),
('INFO', 'Settings updated', 'admin'),
('ALERT', 'Gas leak detected - Level: 470 PPM', 'sensor')
ON DUPLICATE KEY UPDATE message=message;

-- ==========================================
-- CREATE VIEWS FOR EASY QUERIES
-- ==========================================

-- View: Latest 10 incidents
CREATE OR REPLACE VIEW vw_latest_incidents AS
SELECT id, gas_level, status, timestamp, location
FROM incidents
ORDER BY timestamp DESC
LIMIT 10;

-- View: Daily statistics
CREATE OR REPLACE VIEW vw_daily_stats AS
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as total_incidents,
    SUM(CASE WHEN status = 'ALERT' THEN 1 ELSE 0 END) as alert_count,
    SUM(CASE WHEN status = 'NORMAL' THEN 1 ELSE 0 END) as normal_count,
    AVG(gas_level) as avg_gas_level,
    MAX(gas_level) as max_gas_level,
    MIN(gas_level) as min_gas_level
FROM incidents
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- View: Monthly statistics
CREATE OR REPLACE VIEW vw_monthly_stats AS
SELECT 
    DATE_FORMAT(timestamp, '%Y-%m') as month,
    COUNT(*) as total_incidents,
    SUM(CASE WHEN status = 'ALERT' THEN 1 ELSE 0 END) as alert_count,
    SUM(CASE WHEN status = 'NORMAL' THEN 1 ELSE 0 END) as normal_count,
    AVG(gas_level) as avg_gas_level
FROM incidents
GROUP BY DATE_FORMAT(timestamp, '%Y-%m')
ORDER BY month DESC;

-- ==========================================
-- DATABASE SETUP COMPLETE
-- ==========================================

SELECT 'Database setup completed successfully!' as status;
SELECT COUNT(*) as total_incidents FROM incidents;
SELECT COUNT(*) as total_alerts FROM incidents WHERE status = 'ALERT';
SELECT COUNT(*) as total_normals FROM incidents WHERE status = 'NORMAL';