-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 27, 2026 at 07:47 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `gas_monitor_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bluetooth_connections`
--

CREATE TABLE `bluetooth_connections` (
  `id` int(11) NOT NULL,
  `device_name` varchar(100) NOT NULL,
  `mac_address` varchar(17) DEFAULT NULL,
  `port` varchar(20) NOT NULL,
  `status` enum('connected','disconnected','error') DEFAULT 'disconnected',
  `last_connected` datetime DEFAULT NULL,
  `last_disconnected` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Bluetooth device connection history';

--
-- Dumping data for table `bluetooth_connections`
--

INSERT INTO `bluetooth_connections` (`id`, `device_name`, `mac_address`, `port`, `status`, `last_connected`, `last_disconnected`, `created_at`) VALUES
(1, 'HC-05 Gas Sensor', '00:00:00:00:00:00', 'COM5', 'disconnected', NULL, NULL, '2026-02-27 05:17:49');

-- --------------------------------------------------------

--
-- Table structure for table `emergency_contacts`
--

CREATE TABLE `emergency_contacts` (
  `id` int(11) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `contact_name` varchar(100) DEFAULT 'Emergency Contact',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Emergency contacts for SMS alerts';

--
-- Dumping data for table `emergency_contacts`
--

INSERT INTO `emergency_contacts` (`id`, `phone_number`, `contact_name`, `is_active`, `created_at`, `updated_at`) VALUES
(1, '+255797343283', 'Selemani Mairo', 1, '2026-02-27 05:17:49', '2026-02-27 05:17:49'),
(2, '+255712345678', 'Fire Department Dar es Salaam', 0, '2026-02-27 06:28:26', '2026-02-27 07:29:22'),
(3, '+255789012345', 'Family Member', 0, '2026-02-27 06:28:26', '2026-02-27 07:37:18'),
(5, '+255763930052', 'Hydra', 1, '2026-02-27 07:38:18', '2026-02-27 07:38:18');

-- --------------------------------------------------------

--
-- Table structure for table `incidents`
--

CREATE TABLE `incidents` (
  `id` int(11) NOT NULL,
  `gas_level` int(11) NOT NULL COMMENT 'Gas concentration in PPM (0-1023)',
  `status` enum('NORMAL','ALERT') NOT NULL DEFAULT 'NORMAL',
  `timestamp` datetime DEFAULT current_timestamp(),
  `location` varchar(100) DEFAULT 'Main Sensor',
  `sensor_id` varchar(50) DEFAULT 'SENSOR_001'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stores all gas leak incidents';

--
-- Dumping data for table `incidents`
--

INSERT INTO `incidents` (`id`, `gas_level`, `status`, `timestamp`, `location`, `sensor_id`) VALUES
(1, 150, 'NORMAL', '2026-02-27 04:17:49', 'Main Sensor', 'SENSOR_001'),
(2, 180, 'NORMAL', '2026-02-27 03:17:49', 'Main Sensor', 'SENSOR_001'),
(3, 200, 'NORMAL', '2026-02-27 02:17:49', 'Main Sensor', 'SENSOR_001'),
(4, 175, 'NORMAL', '2026-02-27 01:17:49', 'Main Sensor', 'SENSOR_001'),
(5, 190, 'NORMAL', '2026-02-27 00:17:49', 'Main Sensor', 'SENSOR_001'),
(6, 210, 'NORMAL', '2026-02-26 23:17:49', 'Main Sensor', 'SENSOR_001'),
(7, 165, 'NORMAL', '2026-02-26 22:17:49', 'Main Sensor', 'SENSOR_001'),
(8, 185, 'NORMAL', '2026-02-26 21:17:49', 'Main Sensor', 'SENSOR_001'),
(9, 195, 'NORMAL', '2026-02-26 20:17:49', 'Main Sensor', 'SENSOR_001'),
(10, 170, 'NORMAL', '2026-02-26 19:17:49', 'Main Sensor', 'SENSOR_001'),
(11, 450, 'ALERT', '2026-02-26 05:17:49', 'Main Sensor', 'SENSOR_001'),
(12, 520, 'ALERT', '2026-02-26 03:17:49', 'Main Sensor', 'SENSOR_001'),
(13, 480, 'ALERT', '2026-02-26 01:17:49', 'Main Sensor', 'SENSOR_001'),
(14, 410, 'ALERT', '2026-02-25 23:17:49', 'Main Sensor', 'SENSOR_001'),
(15, 430, 'ALERT', '2026-02-25 21:17:49', 'Main Sensor', 'SENSOR_001'),
(16, 160, 'NORMAL', '2026-02-25 05:17:49', 'Main Sensor', 'SENSOR_001'),
(17, 175, 'NORMAL', '2026-02-25 02:17:49', 'Main Sensor', 'SENSOR_001'),
(18, 185, 'NORMAL', '2026-02-24 23:17:49', 'Main Sensor', 'SENSOR_001'),
(19, 170, 'NORMAL', '2026-02-24 20:17:49', 'Main Sensor', 'SENSOR_001'),
(20, 190, 'NORMAL', '2026-02-24 17:17:49', 'Main Sensor', 'SENSOR_001'),
(21, 470, 'ALERT', '2026-02-24 05:17:49', 'Main Sensor', 'SENSOR_001'),
(22, 510, 'ALERT', '2026-02-24 01:17:49', 'Main Sensor', 'SENSOR_001'),
(23, 440, 'ALERT', '2026-02-23 21:17:49', 'Main Sensor', 'SENSOR_001'),
(24, 165, 'NORMAL', '2026-02-23 05:17:49', 'Main Sensor', 'SENSOR_001'),
(25, 175, 'NORMAL', '2026-02-23 00:17:49', 'Main Sensor', 'SENSOR_001'),
(26, 180, 'NORMAL', '2026-02-22 19:17:49', 'Main Sensor', 'SENSOR_001'),
(27, 460, 'ALERT', '2026-02-22 05:17:49', 'Main Sensor', 'SENSOR_001'),
(28, 490, 'ALERT', '2026-02-21 23:17:49', 'Main Sensor', 'SENSOR_001'),
(29, 155, 'NORMAL', '2026-02-27 04:47:49', 'Main Sensor', 'SENSOR_001'),
(30, 168, 'NORMAL', '2026-02-27 04:32:49', 'Main Sensor', 'SENSOR_001'),
(31, 172, 'NORMAL', '2026-02-27 04:02:49', 'Main Sensor', 'SENSOR_001'),
(32, 425, 'ALERT', '2026-02-27 02:47:49', 'Main Sensor', 'SENSOR_001'),
(33, 160, 'NORMAL', '2026-02-27 01:32:49', 'Main Sensor', 'SENSOR_001'),
(34, 178, 'NORMAL', '2026-02-26 23:57:49', 'Main Sensor', 'SENSOR_001'),
(35, 435, 'ALERT', '2026-02-26 22:07:49', 'Main Sensor', 'SENSOR_001'),
(36, 170, 'NORMAL', '2026-02-26 20:37:49', 'Main Sensor', 'SENSOR_001'),
(37, 182, 'NORMAL', '2026-02-26 19:12:49', 'Main Sensor', 'SENSOR_001'),
(38, 165, 'NORMAL', '2026-02-26 17:47:49', 'Main Sensor', 'SENSOR_001');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='System configuration settings';

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`, `description`, `updated_at`) VALUES
(1, 'gas_threshold', '700', 'Gas level threshold for ALERT status (0-1023)', '2026-02-27 07:59:03'),
(2, 'refresh_interval', '5', 'Dashboard refresh interval in seconds', '2026-02-27 08:27:54'),
(3, 'bluetooth_port', 'COM4', 'Bluetooth COM port for HC-05 module', '2026-02-27 08:27:32'),
(4, 'bluetooth_baud_rate', '9600', 'Bluetooth baud rate', '2026-02-27 05:17:48'),
(5, 'theme_preference', 'light', 'Default theme: light or dark', '2026-02-27 05:17:48'),
(6, 'max_records', '10000', 'Maximum records to keep in database', '2026-02-27 05:17:48'),
(7, 'notification_email', '', 'Email for alert notifications', '2026-02-27 05:17:48'),
(8, 'created_at', '2026-02-27 05:17:48', 'System initialization timestamp', '2026-02-27 05:17:48'),
(9, 'sms_contact_id', '5', 'ID of selected contact for SMS alerts (0 = all active contacts)', '2026-02-27 07:43:44'),
(10, 'api_endpoint_url', 'http://127.0.0.1:3000', 'Base URL for the API endpoints', '2026-02-27 09:27:40');

-- --------------------------------------------------------

--
-- Table structure for table `system_logs`
--

CREATE TABLE `system_logs` (
  `id` int(11) NOT NULL,
  `log_type` enum('INFO','WARNING','ERROR','ALERT') NOT NULL,
  `message` text NOT NULL,
  `source` varchar(100) DEFAULT 'system',
  `timestamp` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='System activity and error logs';

--
-- Dumping data for table `system_logs`
--

INSERT INTO `system_logs` (`id`, `log_type`, `message`, `source`, `timestamp`) VALUES
(1, 'INFO', 'System started successfully', 'server', '2026-02-27 05:17:50'),
(2, 'INFO', 'Database connected', 'server', '2026-02-27 05:17:50'),
(3, 'ALERT', 'Gas leak detected - Level: 450 PPM', 'sensor', '2026-02-27 05:17:50'),
(4, 'INFO', 'Dashboard accessed', 'web', '2026-02-27 05:17:50'),
(5, 'WARNING', 'Bluetooth connection unstable', 'bluetooth', '2026-02-27 05:17:50'),
(6, 'ALERT', 'Gas leak detected - Level: 520 PPM', 'sensor', '2026-02-27 05:17:50'),
(7, 'INFO', 'Incident log cleared by admin', 'admin', '2026-02-27 05:17:50'),
(8, 'ERROR', 'Failed to read sensor data', 'sensor', '2026-02-27 05:17:50'),
(9, 'INFO', 'Settings updated', 'admin', '2026-02-27 05:17:50'),
(10, 'ALERT', 'Gas leak detected - Level: 470 PPM', 'sensor', '2026-02-27 05:17:50');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='User accounts for dashboard access';

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `created_at`, `updated_at`, `last_login`) VALUES
(1, 'admin', 'admin@gasmonitor.local', '$2a$10$YourHashedPasswordHere', 'admin', '2026-02-27 05:17:48', '2026-02-27 05:17:48', NULL);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_daily_stats`
-- (See below for the actual view)
--
CREATE TABLE `vw_daily_stats` (
`date` date
,`total_incidents` bigint(21)
,`alert_count` decimal(22,0)
,`normal_count` decimal(22,0)
,`avg_gas_level` decimal(14,4)
,`max_gas_level` int(11)
,`min_gas_level` int(11)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_latest_incidents`
-- (See below for the actual view)
--
CREATE TABLE `vw_latest_incidents` (
`id` int(11)
,`gas_level` int(11)
,`status` enum('NORMAL','ALERT')
,`timestamp` datetime
,`location` varchar(100)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_monthly_stats`
-- (See below for the actual view)
--
CREATE TABLE `vw_monthly_stats` (
`month` varchar(7)
,`total_incidents` bigint(21)
,`alert_count` decimal(22,0)
,`normal_count` decimal(22,0)
,`avg_gas_level` decimal(14,4)
);

-- --------------------------------------------------------

--
-- Structure for view `vw_daily_stats`
--
DROP TABLE IF EXISTS `vw_daily_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_daily_stats`  AS SELECT cast(`incidents`.`timestamp` as date) AS `date`, count(0) AS `total_incidents`, sum(case when `incidents`.`status` = 'ALERT' then 1 else 0 end) AS `alert_count`, sum(case when `incidents`.`status` = 'NORMAL' then 1 else 0 end) AS `normal_count`, avg(`incidents`.`gas_level`) AS `avg_gas_level`, max(`incidents`.`gas_level`) AS `max_gas_level`, min(`incidents`.`gas_level`) AS `min_gas_level` FROM `incidents` GROUP BY cast(`incidents`.`timestamp` as date) ORDER BY cast(`incidents`.`timestamp` as date) DESC ;

-- --------------------------------------------------------

--
-- Structure for view `vw_latest_incidents`
--
DROP TABLE IF EXISTS `vw_latest_incidents`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_latest_incidents`  AS SELECT `incidents`.`id` AS `id`, `incidents`.`gas_level` AS `gas_level`, `incidents`.`status` AS `status`, `incidents`.`timestamp` AS `timestamp`, `incidents`.`location` AS `location` FROM `incidents` ORDER BY `incidents`.`timestamp` DESC LIMIT 0, 10 ;

-- --------------------------------------------------------

--
-- Structure for view `vw_monthly_stats`
--
DROP TABLE IF EXISTS `vw_monthly_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_monthly_stats`  AS SELECT date_format(`incidents`.`timestamp`,'%Y-%m') AS `month`, count(0) AS `total_incidents`, sum(case when `incidents`.`status` = 'ALERT' then 1 else 0 end) AS `alert_count`, sum(case when `incidents`.`status` = 'NORMAL' then 1 else 0 end) AS `normal_count`, avg(`incidents`.`gas_level`) AS `avg_gas_level` FROM `incidents` GROUP BY date_format(`incidents`.`timestamp`,'%Y-%m') ORDER BY date_format(`incidents`.`timestamp`,'%Y-%m') DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bluetooth_connections`
--
ALTER TABLE `bluetooth_connections`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `emergency_contacts`
--
ALTER TABLE `emergency_contacts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone_number` (`phone_number`),
  ADD KEY `idx_phone` (`phone_number`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `incidents`
--
ALTER TABLE `incidents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_gas_level` (`gas_level`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_log_type` (`log_type`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bluetooth_connections`
--
ALTER TABLE `bluetooth_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `emergency_contacts`
--
ALTER TABLE `emergency_contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `incidents`
--
ALTER TABLE `incidents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `system_logs`
--
ALTER TABLE `system_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
