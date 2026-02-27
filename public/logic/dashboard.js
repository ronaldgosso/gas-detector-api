// Configuration
// Fallback to current window origin if not specified in localStorage
let API_BASE_URL = localStorage.getItem('api_endpoint') || window.location.origin;
console.log('Using API Base URL:', API_BASE_URL);
let currentPage = 1;
let itemsPerPage = 10;
let autoRefreshInterval = 2000; // 2 seconds
let autoRefreshEnabled = true;
let notificationSoundEnabled = true;
let currentTheme = 'light';
let arduinoConnected = false;
let signalStrength = 0;
let chart = null;
let dailyChart = null;
let distributionChart = null;
let lastGasLevel = 0;
let lastStatus = 'NORMAL';

// Loading screen progress tracking
let loadingProgress = 0;
let loadingInterval;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize Notiflix immediately after DOM loads
    initializeNotiflix();

    // Start animated loading screen
    startLoadingAnimation();

    // Load saved settings
    await loadSettings();

    // Initialize charts
    initializeCharts();

    // Setup event listeners
    setupEventListeners();

    // Handle initial navigation based on hash
    const initialSection = window.location.hash.substring(1) || 'dashboard';
    showSection(initialSection);

    // Add hashchange listener for browser back/forward and direct links
    window.addEventListener('hashchange', () => {
        const section = window.location.hash.substring(1) || 'dashboard';
        showSection(section);
    });

    // Load all data immediately (don't wait for Arduino)
    loadDataAndInitialize();
});

// ===== NOTIFLIX INITIALIZATION =====
function initializeNotiflix() {
    // Check if Notiflix is loaded
    if (typeof Notiflix !== 'undefined') {
        Notiflix.Notify.init({
            width: '320px',
            position: 'right-top',
            distance: '10px',
            opacity: 1,
            borderRadius: '8px',
            rtl: false,
            timeout: 3000,
            messageMaxLength: 110,
            backOverlay: false,
            backOverlayColor: 'rgba(0,0,0,0.5)',
            plainText: true,
            showOnlyTheLastOne: false,
            clickToClose: true,
            pauseOnHover: true,
            ID: 'NotiflixNotify',
            className: 'notiflix-notify',
            zindex: 4001,
            fontFamily: 'inherit',
            fontSize: '16px',
            cssAnimation: true,
            cssAnimationDuration: 400,
            cssAnimationStyle: 'fade',
            closeButton: true,
            useIcon: true,
            useFontAwesome: false,
            fontAwesomeIconStyle: 'basic',
            fontAwesomeIconSize: '34px',
            success: {
                background: '#22C55E',
                textColor: '#fff',
                childClassName: 'notiflix-notify-success',
                notiflixIconColor: 'rgba(0,0,0,0.2)',
                fontAwesomeIconColor: '#fff',
                backOverlayColor: 'rgba(34,197,94,0.2)',
            },
            failure: {
                background: '#EF4444',
                textColor: '#fff',
                childClassName: 'notiflix-notify-failure',
                notiflixIconColor: 'rgba(0,0,0,0.2)',
                fontAwesomeIconColor: '#fff',
                backOverlayColor: 'rgba(239,68,68,0.2)',
            },
            warning: {
                background: '#EAB308',
                textColor: '#fff',
                childClassName: 'notiflix-notify-warning',
                notiflixIconColor: 'rgba(0,0,0,0.2)',
                fontAwesomeIconColor: '#fff',
                backOverlayColor: 'rgba(234,179,8,0.2)',
            },
            info: {
                background: '#38BDF8',
                textColor: '#fff',
                childClassName: 'notiflix-notify-info',
                notiflixIconColor: 'rgba(0,0,0,0.2)',
                fontAwesomeIconColor: '#fff',
                backOverlayColor: 'rgba(56,189,248,0.2)',
            },
        });

        Notiflix.Report.init({
            titleMaxLength: 32,
            messageMaxLength: 400,
            buttonMaxLength: 32,
            cssAnimation: true,
            cssAnimationDuration: 400,
            cssAnimationStyle: 'fade',
            svgSize: '110px',
            plainText: true,
            titleColor: 'var(--text-primary)',
            messageColor: 'var(--text-secondary)',
            buttonColor: '#38BDF8',
            buttonBackground: 'transparent',
            buttonHoverBackground: 'rgba(56,189,248,0.1)',
            buttonFocusBackground: 'rgba(56,189,248,0.1)',
            svgSize: '110px',
            fontFamily: 'inherit',
        });

        console.log('✅ Notiflix initialized successfully');
    } else {
        console.error('❌ Notiflix not loaded - check script tag in HTML');
    }
}

// ===== LOADING SCREEN ANIMATION =====
function startLoadingAnimation() {
    // Update loading status
    updateLoadingStatus('Initializing dashboard...');

    // Simulate progress with random intervals for more natural feel
    loadingProgress = 0;
    const progressElement = document.getElementById('loadingProgress');
    const statusElement = document.getElementById('loadingStatus');

    if (!progressElement || !statusElement) return;

    // Clear any existing interval
    if (loadingInterval) clearInterval(loadingInterval);

    // Random progress increments for natural feel
    const increments = [5, 8, 12, 7, 10, 15, 8, 12, 18, 10, 15, 20, 12, 18, 25];
    let currentIndex = 0;

    loadingInterval = setInterval(() => {
        if (currentIndex < increments.length) {
            loadingProgress += increments[currentIndex];
            currentIndex++;

            if (loadingProgress > 95) loadingProgress = 95; // Leave room for final completion

            progressElement.style.width = loadingProgress + '%';
        }
    }, 300);
}

function updateLoadingStatus(message) {
    const statusElement = document.getElementById('loadingStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function completeLoading() {
    const progressElement = document.getElementById('loadingProgress');
    if (progressElement) {
        progressElement.style.width = '100%';
    }

    // Wait a moment for the progress bar to reach 100%
    setTimeout(() => {
        hideLoadingScreen();
    }, 300);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        // Add fade-out class for smooth transition
        loadingScreen.classList.add('fade-out');

        // Remove after animation completes
        setTimeout(() => {
            loadingScreen.remove();
        }, 500);
    }
}

// ===== DATA LOADING AND INITIALIZATION =====
async function loadDataAndInitialize() {
    try {
        updateLoadingStatus('Loading historical data...');

        // Load chart data
        await loadHistoricalChartData();
        updateLoadingStatus('Loading latest readings...');

        // Load latest reading
        await loadLatestReading();
        updateLoadingStatus('Loading incident logs...');

        // Load incidents
        await loadIncidents();
        updateLoadingStatus('Loading statistics...');

        // Load statistics
        await loadStatistics();
        updateLoadingStatus('Loading analytics...');

        // Load daily stats
        await loadDailyStats();

        // Load emergency contacts
        updateLoadingStatus('Loading emergency contacts...');
        await loadEmergencyContacts();

        // Complete loading
        completeLoading();

        // Show success notification
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.success('Dashboard loaded with historical data!');
        } else {
            console.log('✅ Dashboard loaded with historical data!');
        }

        // Start real-time updates
        startAutoRefresh();

        // Check Bluetooth connection
        checkBluetoothStatus();

    } catch (error) {
        console.error('Error loading initial ', error);
        completeLoading();

        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.info('Dashboard loaded (some data may be missing)');
        }
    }
}

// ===== THEME MANAGEMENT =====
function loadTheme() {
    const savedTheme = localStorage.getItem('gasMonitorTheme') || 'light';
    setTheme(savedTheme, false);
    updateThemeDisplay(savedTheme);
}

function setTheme(theme, showToast = true) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    // Update theme buttons
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.theme-option[data-theme="${theme}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update theme toggle button
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    if (themeIcon && themeText) {
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
            themeText.textContent = 'Light Mode';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeText.textContent = 'Dark Mode';
        }
    }

    // Update select dropdown
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = theme;

    // Save to localStorage
    localStorage.setItem('gasMonitorTheme', theme);

    // Update theme display
    updateThemeDisplay(theme);

    // Show toast notification
    if (showToast) {
        showToastMessage(`Switched to ${theme === 'dark' ? 'Dark' : 'Light'} Mode`);
    }

    // Update chart colors
    updateChartTheme();
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function updateThemeDisplay(theme) {
    const display = document.getElementById('currentThemeDisplay');
    if (display) {
        display.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }
}

// ===== CHART INITIALIZATION =====
let gasData = {
    labels: [],
    datasets: [{
        label: 'Gas Level (PPM)',
        data: [],
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#38BDF8',
        pointBorderColor: '#0F172A',
        pointHoverRadius: 6
    }]
};

let dailyStatsData = {
    labels: [],
    datasets: [{
        label: 'Total Incidents',
        data: [],
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
    }, {
        label: 'Alerts',
        data: [],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
    }]
};

let distributionData = {
    labels: ['Normal', 'Alert'],
    datasets: [{
        data: [0, 0],
        backgroundColor: ['#22C55E', '#EF4444'],
        borderWidth: 0
    }]
};

function initializeCharts() {
    // Main Gas Chart
    const ctx = document.getElementById('gasChart')?.getContext('2d');
    if (ctx) {
        chart = new Chart(ctx, {
            type: 'line',
            data: gasData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: currentTheme === 'dark' ? '#F1F5F9' : '#212529',
                            font: { size: 14 }
                        }
                    },
                    tooltip: {
                        backgroundColor: currentTheme === 'dark' ? '#1E293B' : '#ffffff',
                        titleColor: '#38BDF8',
                        bodyColor: currentTheme === 'dark' ? '#F1F5F9' : '#212529',
                        borderColor: '#38BDF8',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                        ticks: { color: currentTheme === 'dark' ? '#94A3B8' : '#6c757d' }
                    },
                    y: {
                        grid: { color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                        ticks: { color: currentTheme === 'dark' ? '#94A3B8' : '#6c757d', beginAtZero: true },
                        title: { display: true, text: 'PPM', color: currentTheme === 'dark' ? '#F1F5F9' : '#212529' }
                    }
                }
            }
        });
    }

    // Daily Statistics Chart
    const dailyCtx = document.getElementById('dailyChart')?.getContext('2d');
    if (dailyCtx) {
        dailyChart = new Chart(dailyCtx, {
            type: 'line',
            data: dailyStatsData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: currentTheme === 'dark' ? '#F1F5F9' : '#212529' }
                    }
                },
                scales: {
                    x: {
                        grid: { color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                        ticks: { color: currentTheme === 'dark' ? '#94A3B8' : '#6c757d' }
                    },
                    y: {
                        grid: { color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                        ticks: { color: currentTheme === 'dark' ? '#94A3B8' : '#6c757d', beginAtZero: true }
                    }
                }
            }
        });
    }

    // Distribution Chart
    const distCtx = document.getElementById('distributionChart')?.getContext('2d');
    if (distCtx) {
        distributionChart = new Chart(distCtx, {
            type: 'doughnut',
            data: distributionData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: currentTheme === 'dark' ? '#F1F5F9' : '#212529' }
                    }
                }
            }
        });
    }
}

function updateChartTheme() {
    if (!chart || !dailyChart || !distributionChart) return;

    const textColor = currentTheme === 'dark' ? '#F1F5F9' : '#212529';
    const gridColor = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    // Update main chart
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.y.ticks.color = textColor;
    chart.options.plugins.legend.labels.color = textColor;

    // Update daily chart
    dailyChart.options.scales.x.grid.color = gridColor;
    dailyChart.options.scales.x.ticks.color = textColor;
    dailyChart.options.scales.y.grid.color = gridColor;
    dailyChart.options.scales.y.ticks.color = textColor;
    dailyChart.options.plugins.legend.labels.color = textColor;

    // Update distribution chart
    distributionChart.options.plugins.legend.labels.color = textColor;

    chart.update();
    dailyChart.update();
    distributionChart.update();
}

// ===== LOAD HISTORICAL CHART DATA =====
async function loadHistoricalChartData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chart/data?limit=50`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            // Clear existing data
            gasData.labels = [];
            gasData.datasets[0].data = [];

            // Populate with historical data
            data.data.forEach(item => {
                const timestamp = new Date(item.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                gasData.labels.push(timestamp);
                gasData.datasets[0].data.push(item.gas_level);

                // Set chart color based on the latest data point
                if (item.gas_level > 800) {
                    gasData.datasets[0].borderColor = '#EF4444';
                    gasData.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.1)';
                } else if (item.gas_level > 400) {
                    gasData.datasets[0].borderColor = '#EAB308';
                    gasData.datasets[0].backgroundColor = 'rgba(234, 179, 8, 0.1)';
                } else {
                    gasData.datasets[0].borderColor = '#38BDF8';
                    gasData.datasets[0].backgroundColor = 'rgba(56, 189, 248, 0.1)';
                }
            });

            // Update chart
            if (chart) chart.update();

            // Update last known values
            const latest = data.data[data.data.length - 1];
            lastGasLevel = latest.gas_level;
            lastStatus = latest.status;

            console.log(`✅ Loaded ${data.data.length} historical data points`);
        } else {
            console.log('ℹ️ No historical data found in database');
            // Initialize with demo data if database is empty
            initializeDemoData();
        }
    } catch (error) {
        console.error('❌ Error loading historical chart data:', error);
        // Initialize with demo data on error
        initializeDemoData();
    }
}

// ===== INITIALIZE DEMO DATA (if database is empty) =====
function initializeDemoData() {
    // Generate demo data for the last 2 hours
    const now = new Date();
    gasData.labels = [];
    gasData.datasets[0].data = [];

    for (let i = 0; i < 20; i++) {
        const time = new Date(now - (20 - i) * 6 * 60000); // 6 minutes apart
        const timestamp = time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        // Generate realistic gas readings (mostly normal, occasional spikes)
        let gasLevel;
        if (i % 5 === 0 && i > 0) {
            // Every 5th reading is an alert
            gasLevel = 450 + Math.floor(Math.random() * 200);
        } else {
            // Normal readings
            gasLevel = 150 + Math.floor(Math.random() * 100);
        }

        gasData.labels.push(timestamp);
        gasData.datasets[0].data.push(gasLevel);
    }

    // Set chart color based on latest demo data
    const latestLevel = gasData.datasets[0].data[gasData.datasets[0].data.length - 1];
    if (latestLevel > 800) {
        gasData.datasets[0].borderColor = '#EF4444';
        gasData.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.1)';
    } else if (latestLevel > 400) {
        gasData.datasets[0].borderColor = '#EAB308';
        gasData.datasets[0].backgroundColor = 'rgba(234, 179, 8, 0.1)';
    } else {
        gasData.datasets[0].borderColor = '#38BDF8';
        gasData.datasets[0].backgroundColor = 'rgba(56, 189, 248, 0.1)';
    }

    if (chart) chart.update();
    lastGasLevel = latestLevel;
    lastStatus = latestLevel > 400 ? 'ALERT' : 'NORMAL';

    console.log('✅ Initialized with demo data');
}

// ===== LOAD LATEST READING =====
async function loadLatestReading() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sensor/latest`);
        const data = await response.json();

        if (data.success && data.data) {
            updateCurrentReading(data.data);
            lastGasLevel = data.data.gas_level;
            lastStatus = data.data.status;
            updateConnectionStatus(true);
            console.log('✅ Loaded latest reading from database');
        } else {
            // Use last known value from chart data
            if (lastGasLevel > 0) {
                const fakeData = {
                    gas_level: lastGasLevel,
                    status: lastStatus,
                    timestamp: new Date().toISOString(),
                    location: 'Main Sensor'
                };
                updateCurrentReading(fakeData);
                updateConnectionStatus(false);
            }
        }
    } catch (error) {
        console.error('❌ Error loading latest reading:', error);
        updateConnectionStatus(false);
    }
}

// ===== LOAD INCIDENTS =====
async function loadIncidents() {
    try {
        const filter = document.getElementById('filterStatus')?.value || 'all';
        const response = await fetch(`${API_BASE_URL}/api/incidents?page=${currentPage}&limit=${itemsPerPage}&status=${filter}`);
        const data = await response.json();

        if (data.success) {
            populateTable(data.incidents);
            setupPagination(data.total, data.page, data.limit);
            console.log(`✅ Loaded ${data.incidents.length} incidents`);
        }
    } catch (error) {
        console.error('❌ Error loading incidents:', error);
    }
}

// ===== LOAD STATISTICS =====
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/statistics`);
        const data = await response.json();

        if (data.success) {
            updateStatistics(data);
            console.log('✅ Loaded statistics');
        }
    } catch (error) {
        console.error('❌ Error loading statistics:', error);
    }
}

// ===== LOAD DAILY STATS =====
async function loadDailyStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/statistics/daily?days=7`);
        const data = await response.json();

        if (data.success) {
            updateDailyChart(data.data);
            updateDistributionChart(data.data);
            console.log('✅ Loaded daily statistics');
        }
    } catch (error) {
        console.error('❌ Error loading daily stats:', error);
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            showSection(target);
        });
    });
}

function showSection(section) {
    // Hide all sections
    const dashboard = document.getElementById('dashboard');
    const logs = document.getElementById('logs');
    const analytics = document.getElementById('analytics');
    const settings = document.getElementById('settings');

    if (dashboard) dashboard.style.display = 'none';
    if (logs) logs.style.display = 'none';
    if (analytics) analytics.style.display = 'none';
    if (settings) settings.style.display = 'none';

    // Show selected section
    if (section === 'dashboard' && dashboard) {
        dashboard.style.display = 'block';
    } else if (section === 'logs' && logs) {
        logs.style.display = 'block';
        loadIncidents();
    } else if (section === 'analytics' && analytics) {
        analytics.style.display = 'block';
        loadDailyStats();
    } else if (section === 'settings' && settings) {
        settings.style.display = 'block';
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.nav-link[href="#${section}"]`);
    if (activeLink) activeLink.classList.add('active');
}

// ===== AUTO REFRESH =====
function startAutoRefresh() {
    if (autoRefreshEnabled) {
        setInterval(() => {
            if (autoRefreshEnabled) {
                fetchRealTimeData();
                loadIncidents();
                loadStatistics();
                checkBluetoothStatus();
            }
        }, autoRefreshInterval);
    }
}

async function checkBluetoothStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/bluetooth/status`);
        const data = await response.json();

        if (data.success && data.message) {
            const btStatus = data.message;
            const isConnected = btStatus.status === 'CONNECTED';
            arduinoConnected = isConnected;
            updateArduinoStatus(isConnected, btStatus.device_name);
        } else {
            arduinoConnected = false;
            updateArduinoStatus(false);
        }
    } catch (error) {
        console.error('Error checking Bluetooth status:', error);
        arduinoConnected = false;
        updateArduinoStatus(false);
    }
}

function updateArduinoStatus(connected, deviceName = '') {
    const statusDot = document.getElementById('arduinoStatus');
    const statusText = document.getElementById('arduinoText');
    const signalStrengthEl = document.getElementById('signalStrength');

    if (statusDot && statusText && signalStrengthEl) {
        if (connected) {
            statusDot.className = 'status-dot online';
            statusText.textContent = `Connected (${deviceName})`;
            statusText.style.color = '#22C55E';
            if (signalStrengthEl.textContent === '0%') {
                signalStrengthEl.textContent = `${85 + Math.floor(Math.random() * 15)}%`;
            }
        } else {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Not Connected';
            statusText.style.color = '#EF4444';
            signalStrengthEl.textContent = '0%';
        }
    }
}

// ===== DATA FETCHING =====
async function fetchRealTimeData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sensor/latest`);
        const data = await response.json();

        if (data.success && data.data) {
            // Only update if data is newer than what we have
            const newTimestamp = new Date(data.data.timestamp).getTime();
            const currentTimestamp = lastGasLevel > 0 ? new Date().getTime() : 0;

            if (newTimestamp > currentTimestamp || lastGasLevel === 0) {
                updateCurrentReading(data.data);
                updateChart(data.data);
                updateConnectionStatus(true);
                lastGasLevel = data.data.gas_level;
                lastStatus = data.data.status;
            }
        }
    } catch (error) {
        console.error('Error fetching real-time data:', error);
    }
}

// ===== UI UPDATES =====
function updateCurrentReading(data) {
    const gasLevel = data.gas_level || lastGasLevel || 0;
    const status = data.status || lastStatus || 'NORMAL';

    const levelEl = document.getElementById('currentGasLevel');
    const statusEl = document.getElementById('currentStatus');

    if (levelEl && statusEl) {
        levelEl.textContent = gasLevel;
        statusEl.textContent = status;

        // Update status styling
        statusEl.className = 'reading-status';

        if (gasLevel > 800) {
            statusEl.classList.add('danger');
        } else if (gasLevel > 400) {
            statusEl.classList.add('warning');
        }

        // Show/hide alert banner
        if (status === 'ALERT' && gasLevel > 400) {
            showAlertBanner(gasLevel);
        } else {
            closeAlert();
        }
    }
}

function updateChart(data) {
    const gasLevel = data.gas_level || 0;
    const timestamp = new Date(data.timestamp || Date.now()).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    // Add new data point
    gasData.labels.push(timestamp);
    gasData.datasets[0].data.push(gasLevel);

    // Keep only last 20 data points
    if (gasData.labels.length > 20) {
        gasData.labels.shift();
        gasData.datasets[0].data.shift();
    }

    // Update chart color based on gas level
    if (gasLevel > 800) {
        gasData.datasets[0].borderColor = '#EF4444';
        gasData.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.1)';
    } else if (gasLevel > 400) {
        gasData.datasets[0].borderColor = '#EAB308';
        gasData.datasets[0].backgroundColor = 'rgba(234, 179, 8, 0.1)';
    } else {
        gasData.datasets[0].borderColor = '#38BDF8';
        gasData.datasets[0].backgroundColor = 'rgba(56, 189, 248, 0.1)';
    }

    if (chart) chart.update();
}

function updateDailyChart(data) {
    dailyStatsData.labels = data.map(item => item.date);
    dailyStatsData.datasets[0].data = data.map(item => item.total_incidents);
    dailyStatsData.datasets[1].data = data.map(item => item.alert_count);
    if (dailyChart) dailyChart.update();
}

function updateDistributionChart(data) {
    const normalCount = data.reduce((sum, item) => sum + item.normal_count, 0);
    const alertCount = data.reduce((sum, item) => sum + item.alert_count, 0);

    distributionData.datasets[0].data = [normalCount, alertCount];
    if (distributionChart) distributionChart.update();
}

function populateTable(incidents) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (incidents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                    <p class="text-muted mt-2">No incidents recorded yet</p>
                </td>
            </tr>
        `;
        document.getElementById('recordsShown').textContent = '0';
        document.getElementById('totalRecordsBottom').textContent = '0';
        return;
    }

    incidents.forEach(incident => {
        const row = document.createElement('tr');
        const date = new Date(incident.timestamp);
        const formattedTime = date.toLocaleString();
        const statusClass = incident.status === 'ALERT' ? 'ALERT' : 'NORMAL';

        row.innerHTML = `
            <td>${incident.id || '-'}</td>
            <td>${formattedTime}</td>
            <td>${incident.gas_level}</td>
            <td><span class="status-badge ${statusClass}">${incident.status}</span></td>
            <td>
                <button class="action-btn view" onclick="viewIncident(${incident.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn delete" onclick="deleteIncident(${incident.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    document.getElementById('recordsShown').textContent = incidents.length;
    document.getElementById('totalRecordsBottom').textContent =
        document.getElementById('totalRecords').textContent;
}

function setupPagination(totalItems, currentPage, itemsPerPage) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return;

    // Previous button
    const prevItem = document.createElement('li');
    prevItem.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevItem.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage - 1})">&laquo;</a>`;
    pagination.appendChild(prevItem);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageItem.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
            pagination.appendChild(pageItem);

            // Add ellipsis
            if (i === 1 && currentPage > 3) {
                const ellipsis = document.createElement('li');
                ellipsis.className = 'page-item disabled';
                ellipsis.innerHTML = '<span class="page-link">...</span>';
                pagination.appendChild(ellipsis);
            }
            if (i === totalPages && currentPage < totalPages - 2) {
                const ellipsis = document.createElement('li');
                ellipsis.className = 'page-item disabled';
                ellipsis.innerHTML = '<span class="page-link">...</span>';
                pagination.appendChild(ellipsis);
            }
        }
    }

    // Next button
    const nextItem = document.createElement('li');
    nextItem.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextItem.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage + 1})">&raquo;</a>`;
    pagination.appendChild(nextItem);
}

function changePage(page) {
    currentPage = page;
    loadIncidents();
}

function updateStatistics(stats) {
    document.getElementById('alertsToday').textContent = stats.alertsToday || 0;
    document.getElementById('totalRecords').textContent = stats.totalRecords || 0;
    document.getElementById('totalRecordsBottom').textContent = stats.totalRecords || 0;
    document.getElementById('avgGasLevel').textContent = stats.avgGasLevel || 0;

    if (stats.lastAlert) {
        const date = new Date(stats.lastAlert);
        document.getElementById('lastAlert').textContent = date.toLocaleString();
    } else {
        document.getElementById('lastAlert').textContent = 'Never';
    }
}

function updateConnectionStatus(isConnected) {
    const statusDot = document.getElementById('connectionStatus');
    const statusText = document.getElementById('connectionText');
    const sensorDot = document.getElementById('sensorStatus');
    const sensorText = document.getElementById('sensorText');

    if (statusDot && statusText && sensorDot && sensorText) {
        if (isConnected) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Connected';
            statusText.style.color = '#22C55E';

            sensorDot.className = 'status-dot online';
            sensorText.textContent = 'Active';
            sensorText.style.color = '#22C55E';
        } else {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Disconnected';
            statusText.style.color = '#EF4444';

            sensorDot.className = 'status-dot';
            sensorText.textContent = 'Offline';
            sensorText.style.color = '#EF4444';
        }
    }
}

function showAlertBanner(gasLevel) {
    const banner = document.getElementById('alertBanner');
    if (!banner) return;

    document.getElementById('alertLevel').textContent = gasLevel;
    banner.style.display = 'block';

    // Auto-hide after 10 seconds
    setTimeout(() => {
        closeAlert();
    }, 10000);
}

function closeAlert() {
    const banner = document.getElementById('alertBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

function showToastMessage(message) {
    const toastEl = document.getElementById('themeToast');
    const toastMessage = document.getElementById('themeToastMessage');
    if (toastMessage && toastEl) {
        toastMessage.textContent = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
}

// ===== ACTIONS =====
function refreshAllData() {
    if (typeof Notiflix !== 'undefined') {
        Notiflix.Notify.info('Refreshing all data...');
    }

    Promise.all([
        loadHistoricalChartData(),
        loadLatestReading(),
        loadIncidents(),
        loadStatistics(),
        loadDailyStats()
    ]).then(() => {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.success('All data refreshed successfully!');
        }
    }).catch((error) => {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.failure('Error refreshing data');
        }
    });
}

function clearLogs() {
    if (typeof Notiflix === 'undefined') {
        if (confirm('Clear all logs? This cannot be undone.')) {
            fetch(`${API_BASE_URL}/api/incidents/clear`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('Logs cleared');
                        loadHistoricalChartData();
                        loadLatestReading();
                        loadIncidents();
                        loadStatistics();
                    }
                });
        }
        return;
    }

    Notiflix.Confirm.show(
        'Clear Logs',
        'Are you sure you want to clear all incident logs? This action cannot be undone.',
        'Yes, Clear',
        'Cancel',
        () => {
            fetch(`${API_BASE_URL}/api/incidents/clear`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Notiflix.Report.success(
                            'Logs Cleared',
                            'All incident logs have been cleared successfully.',
                            'OK'
                        );
                        // Reload all data
                        loadHistoricalChartData();
                        loadLatestReading();
                        loadIncidents();
                        loadStatistics();
                    } else {
                        Notiflix.Report.failure(
                            'Error',
                            'Failed to clear logs: ' + data.message,
                            'OK'
                        );
                    }
                })
                .catch(error => {
                    Notiflix.Report.failure(
                        'Error',
                        'An error occurred while clearing logs',
                        'OK'
                    );
                });
        },
        () => { },
        {}
    );
}

function exportData(format) {
    if (format === 'pdf') {
        exportToPDF();
    } else if (format === 'json') {
        exportToJSON();
    } else if (format === 'csv') {
        exportToCSV();
    }
}

function exportToPDF() {
    if (typeof Notiflix !== 'undefined') {
        Notiflix.Loading.standard('Generating PDF...');
    }

    setTimeout(() => {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Loading.remove();
            Notiflix.Report.info(
                'PDF Export',
                'PDF export functionality will be implemented using jsPDF library.',
                'OK'
            );
        }
    }, 1000);
}

function exportToJSON() {
    fetch(`${API_BASE_URL}/api/incidents/export?format=json`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gas_incidents_${Date.now()}.json`;
                a.click();
                window.URL.revokeObjectURL(url);
                if (typeof Notiflix !== 'undefined') {
                    Notiflix.Notify.success('JSON exported successfully!');
                }
            }
        })
        .catch(error => {
            if (typeof Notiflix !== 'undefined') {
                Notiflix.Notify.failure('Failed to export JSON');
            }
        });
}

function exportToCSV() {
    fetch(`${API_BASE_URL}/api/incidents/export?format=csv`)
        .then(response => response.text())
        .then(data => {
            const blob = new Blob([data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gas_incidents_${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            if (typeof Notiflix !== 'undefined') {
                Notiflix.Notify.success('CSV exported successfully!');
            }
        })
        .catch(error => {
            if (typeof Notiflix !== 'undefined') {
                Notiflix.Notify.failure('Failed to export CSV');
            }
        });
}

function filterTable() {
    currentPage = 1;
    loadIncidents();
}

function playAlertSound() {
    // Create and play alert sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.1;

    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
    }, 500);
}

// ===== SETTINGS MANAGEMENT =====
async function saveSettings() {
    const thresholdInput = document.getElementById('thresholdInput') || document.getElementById('modalThresholdInput');
    const intervalInput = document.getElementById('refreshInterval') || document.getElementById('modalRefreshInterval');
    const portInput = document.getElementById('bluetoothPort') || document.getElementById('modalBluetoothPort');
    const endpointInput = document.getElementById('apiEndpoint') || document.getElementById('modalApiEndpoint');
    const themeSelect = document.getElementById('themeSelect');

    if (!thresholdInput || !intervalInput || !endpointInput) return;

    const threshold = thresholdInput.value;
    const interval = intervalInput.value;
    const port = portInput ? portInput.value : 'COM5';
    const endpoint = endpointInput.value;
    const theme = themeSelect ? themeSelect.value : 'light';

    autoRefreshEnabled = document.getElementById('autoRefreshToggle')?.checked ?? true;
    notificationSoundEnabled = document.getElementById('notificationSoundToggle')?.checked ?? true;

    // Detect if API endpoint changed
    const oldEndpoint = localStorage.getItem('api_endpoint');
    const endpointChanged = oldEndpoint !== endpoint;

    // Prepare settings for backend
    const settingsData = {
        settings: {
            gas_threshold: threshold,
            refresh_interval: interval,
            bluetooth_port: port,
            api_endpoint_url: endpoint,
            theme_preference: theme,
            auto_refresh: autoRefreshEnabled.toString(),
            sound_enabled: notificationSoundEnabled.toString()
        }
    };

    try {
        // Save to backend
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });

        const result = await response.json();

        if (result.success) {
            // Also sync to localStorage for browser-side persistence/fallbacks
            localStorage.setItem('gasThreshold', threshold);
            localStorage.setItem('refreshInterval', interval);
            localStorage.setItem('bluetoothPort', port);
            localStorage.setItem('api_endpoint', endpoint);
            localStorage.setItem('gasMonitorTheme', theme);
            localStorage.setItem('autoRefreshEnabled', autoRefreshEnabled);
            localStorage.setItem('notificationSoundEnabled', notificationSoundEnabled);

            // Apply locally
            autoRefreshInterval = parseInt(interval) * 1000;
            setTheme(theme);

            if (typeof Notiflix !== 'undefined') {
                Notiflix.Notify.success('Settings saved to database!');
            }

            if (endpointChanged) {
                if (typeof Notiflix !== 'undefined') {
                    Notiflix.Confirm.show(
                        'API Endpoint Changed',
                        'The API endpoint has changed. The page will reload to apply changes.',
                        'Reload Now',
                        'Later',
                        () => location.reload()
                    );
                } else if (confirm('API endpoint changed. Reload page?')) {
                    location.reload();
                }
            }
        } else {
            throw new Error(result.message || 'Failed to save settings');
        }
    } catch (error) {
        console.error('Settings save error:', error);
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.failure('Error saving settings: ' + error.message);
        }
    }
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`);
        const result = await response.json();

        let settings = {};
        if (result.success && result.data) {
            settings = result.data;
        }

        // Fallbacks to localStorage if API fails or keys missing
        const threshold = settings.gas_threshold || localStorage.getItem('gasThreshold') || '400';
        const interval = settings.refresh_interval || localStorage.getItem('refreshInterval') || '2';
        const port = settings.bluetooth_port || localStorage.getItem('bluetoothPort') || 'COM5';
        const endpoint = settings.api_endpoint_url || localStorage.getItem('api_endpoint') || window.location.origin;
        const theme = settings.theme_preference || localStorage.getItem('gasMonitorTheme') || 'light';
        const autoRefresh = (settings.auto_refresh !== undefined ? settings.auto_refresh === 'true' : localStorage.getItem('autoRefreshEnabled') !== 'false');
        const notificationSound = (settings.sound_enabled !== undefined ? settings.sound_enabled === 'true' : localStorage.getItem('notificationSoundEnabled') !== 'false');

        // Update UI
        const thresholdInput = document.getElementById('thresholdInput');
        if (thresholdInput) {
            thresholdInput.value = threshold;
            document.getElementById('refreshInterval').value = interval;
            if (document.getElementById('bluetoothPort')) document.getElementById('bluetoothPort').value = port;
            document.getElementById('apiEndpoint').value = endpoint;
            if (document.getElementById('themeSelect')) document.getElementById('themeSelect').value = theme;
            if (document.getElementById('autoRefreshToggle')) document.getElementById('autoRefreshToggle').checked = autoRefresh;
            if (document.getElementById('notificationSoundToggle')) document.getElementById('notificationSoundToggle').checked = notificationSound;
        }

        // Sync modal if exists
        if (document.getElementById('modalThresholdInput')) {
            document.getElementById('modalThresholdInput').value = threshold;
            document.getElementById('modalRefreshInterval').value = interval;
            document.getElementById('modalBluetoothPort').value = port;
            document.getElementById('modalApiEndpoint').value = endpoint;
        }

        // Update global state
        autoRefreshEnabled = autoRefresh;
        notificationSoundEnabled = notificationSound;
        autoRefreshInterval = parseInt(interval) * 1000;

        // Apply theme
        setTheme(theme);

    } catch (error) {
        console.error('Error loading settings from API:', error);
        // Minimal fallback to localStorage on total network error
        const interval = localStorage.getItem('refreshInterval') || '2';
        autoRefreshInterval = parseInt(interval) * 1000;
    }
}

function saveModalSettings() {
    if (document.getElementById('modalThresholdInput')) {
        document.getElementById('thresholdInput').value = document.getElementById('modalThresholdInput').value;
        document.getElementById('refreshInterval').value = document.getElementById('modalRefreshInterval').value;
        document.getElementById('bluetoothPort').value = document.getElementById('modalBluetoothPort').value;
        document.getElementById('apiEndpoint').value = document.getElementById('modalApiEndpoint').value;
    }

    saveSettings();
    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
    if (modal) modal.hide();
}

// ===== INCIDENT ACTIONS =====
function viewIncident(id) {
    fetch(`${API_BASE_URL}/api/incidents/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const incident = data.data;
                const date = new Date(incident.timestamp);
                if (typeof Notiflix !== 'undefined') {
                    Notiflix.Report.info(
                        `Incident #${incident.id}`,
                        `Gas Level: ${incident.gas_level} PPM\nStatus: ${incident.status}\nLocation: ${incident.location}\nTime: ${date.toLocaleString()}`,
                        'OK'
                    );
                }
            }
        })
        .catch(error => {
            if (typeof Notiflix !== 'undefined') {
                Notiflix.Notify.failure('Failed to fetch incident details');
            }
        });
}

function deleteIncident(id) {
    if (typeof Notiflix === 'undefined') {
        if (confirm(`Delete incident #${id}?`)) {
            fetch(`${API_BASE_URL}/api/incidents/${id}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('Incident deleted');
                        loadHistoricalChartData();
                        loadLatestReading();
                        loadIncidents();
                        loadStatistics();
                    }
                });
        }
        return;
    }

    Notiflix.Confirm.show(
        'Delete Incident',
        `Are you sure you want to delete incident #${id}?`,
        'Yes, Delete',
        'Cancel',
        () => {
            fetch(`${API_BASE_URL}/api/incidents/${id}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Notiflix.Notify.success('Incident deleted successfully!');
                        // Reload data to reflect changes
                        loadHistoricalChartData();
                        loadLatestReading();
                        loadIncidents();
                        loadStatistics();
                    } else {
                        Notiflix.Notify.failure('Failed to delete incident');
                    }
                })
                .catch(error => {
                    Notiflix.Notify.failure('Error deleting incident');
                });
        },
        () => { },
        {}
    );
}

// ===== EMERGENCY PHONE MANAGEMENT =====
async function loadEmergencyPhone() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/emergency-contacts`);
        const result = await response.json();

        if (result.success && result.data) {
            const phone = result.data.phone_number.replace('+255', '').trim();
            const inputs = [
                document.getElementById('emergencyPhone'),
                document.getElementById('modalEmergencyPhone')
            ];
            inputs.forEach(input => {
                if (input) input.value = phone;
            });
            localStorage.setItem('emergencyPhone', phone);
        }
    } catch (err) {
        console.error('Error loading primary contact:', err);
    }
}

function saveEmergencyPhone() {
    const phoneInput = document.getElementById('emergencyPhone');
    const statusEl = document.getElementById('phoneSaveStatus');
    const rawPhone = phoneInput.value.trim();

    // Validate Tanzanian number format
    if (!/^[0-9]{9}$/.test(rawPhone.replace(/\s/g, ''))) {
        showPhoneStatus('❌ Invalid format. Use 9 digits (e.g., 712345678)', 'danger');
        return;
    }

    // Format consistently: +255XXXXXXXXX
    const formattedPhone = `+255${rawPhone.replace(/\s/g, '')}`;

    // Save to localStorage immediately
    localStorage.setItem('emergencyPhone', rawPhone);

    // Update modal field too
    document.getElementById('modalEmergencyPhone').value = rawPhone;

    // Send to server
    statusEl.innerHTML = '<span class="text-warning"><i class="fas fa-spinner fa-spin me-1"></i>Saving...</span>';

    fetch(`${API_BASE_URL}/api/emergency-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phone_number: formattedPhone,
            contact_name: 'Primary Alert Contact'
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showPhoneStatus('✅ Emergency contact saved!', 'success');
                Notiflix.Notify.success('Emergency contact saved successfully!');
                // Refresh contacts list if exists
                if (typeof loadContacts === 'function') loadContacts();
            } else {
                showPhoneStatus(`⚠️ Saved locally only: ${data.message || 'Server error'}`, 'warning');
            }
        })
        .catch(error => {
            console.error('Save failed:', error);
            showPhoneStatus('⚠️ Saved locally. Server unavailable.', 'warning');
        });
}

function showPhoneStatus(message, type) {
    const el = document.getElementById('phoneSaveStatus') || document.getElementById('phoneStatus');
    if (!el) return;

    el.innerHTML = `<span class="text-${type}"><i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-1"></i>${message}</span>`;

    // Auto-clear after 5 seconds for success
    if (type === 'success') {
        setTimeout(() => { el.innerHTML = ''; }, 5000);
    }
}

// Add phone validation on input
document.addEventListener('DOMContentLoaded', () => {
    const phoneInputs = document.querySelectorAll('#emergencyPhone, #modalEmergencyPhone');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function (e) {
            // Allow only digits and spaces
            this.value = this.value.replace(/[^0-9\s]/g, '');

            // Auto-format as user types: 712 345 678
            const digits = this.value.replace(/\s/g, '');
            if (digits.length > 3 && digits.length <= 6) {
                this.value = `${digits.slice(0, 3)} ${digits.slice(3)}`;
            } else if (digits.length > 6) {
                this.value = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
            }
        });
    });

    // Initialize phone field
    loadEmergencyPhone();

    // Add save button listener for modal
    const modalSaveBtn = document.querySelector('#settingsModal .btn-primary');
    if (modalSaveBtn && !modalSaveBtn.dataset.phoneListener) {
        modalSaveBtn.dataset.phoneListener = 'true';
        const originalClick = modalSaveBtn.onclick;
        modalSaveBtn.onclick = function (e) {
            saveEmergencyPhone(); // Save phone first
            if (originalClick) originalClick(e);
        };
    }
});

// ===== EMERGENCY CONTACT MANAGEMENT =====
// Load all active contacts and populate UI
async function loadEmergencyContacts() {
    try {
        // Load contacts for dropdowns
        const response = await fetch(`${API_BASE_URL}/api/emergency-contacts/list`);
        const data = await response.json();

        if (data.success) {
            // Update dropdowns
            updateContactDropdowns(data.data);

            // Update contacts table
            updateContactsTable(data.data);

            // Load selected contact
            loadSelectedContact();
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
        showError('Failed to load emergency contacts');
    }
}

// Update all contact dropdowns
function updateContactDropdowns(contacts) {
    const dropdowns = [
        document.getElementById('smsContactSelect'),
        document.getElementById('modalSmsContactSelect')
    ];

    dropdowns.forEach(dropdown => {
        if (!dropdown) return;

        // Preserve current selection
        const currentVal = dropdown.value;

        // Clear and repopulate
        dropdown.innerHTML = '<option value="0">📱 Send to ALL Active Contacts</option>';

        contacts.forEach(contact => {
            const option = document.createElement('option');
            option.value = contact.id;
            option.textContent = `👤 ${contact.contact_name} (${contact.phone_number})`;
            dropdown.appendChild(option);
        });

        // Restore selection if still valid
        if (dropdown.querySelector(`option[value="${currentVal}"]`)) {
            dropdown.value = currentVal;
        }
    });
}

// Update contacts table display
function updateContactsTable(contacts) {
    const tableBody = document.getElementById('activeContactsTable');
    const countBadge = document.getElementById('activeContactsCount');

    if (!tableBody || !countBadge) return;

    countBadge.textContent = contacts.length;

    if (contacts.length === 0) {
        tableBody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-3 text-muted">
          <i class="fas fa-inbox fa-2x mb-2"></i>
          <div>No emergency contacts configured</div>
          <small class="mt-1 d-block">Add contacts above to receive SMS alerts</small>
        </td>
      </tr>
    `;
        return;
    }

    tableBody.innerHTML = contacts.map(contact => `
    <tr>
      <td><i class="fas fa-user me-1 text-primary"></i> ${contact.contact_name}</td>
      <td><i class="fas fa-phone me-1 text-success"></i> ${contact.phone_number}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" 
                onclick="deleteContact(${contact.id})" 
                title="Deactivate contact">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Load currently selected SMS contact
async function loadSelectedContact() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/emergency-contacts/settings/sms-selection`);
        const data = await response.json();

        if (data.success) {
            const dropdowns = [
                document.getElementById('smsContactSelect'),
                document.getElementById('modalSmsContactSelect')
            ];

            dropdowns.forEach(dropdown => {
                if (dropdown) {
                    // If specific contact selected
                    if (data.data && !data.isMultiple) {
                        dropdown.value = data.data.id || '0';
                    } else {
                        dropdown.value = '0'; // All contacts
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading selected contact:', error);
    }
}

// Add new emergency contact
async function addEmergencyContact() {
    const phoneInput = document.getElementById('newContactPhone');
    const nameInput = document.getElementById('newContactName');
    const statusEl = document.getElementById('addContactStatus');

    let rawPhone = phoneInput.value.trim();
    const contactName = nameInput.value.trim() || 'Emergency Contact';

    // Validate phone format (Tanzania 9 digits)
    if (!/^[0-9]{9}$/.test(rawPhone.replace(/\s/g, ''))) {
        showContactStatus('❌ Invalid format. Enter 9 digits (e.g., 712345678)', 'danger', statusEl);
        phoneInput.focus();
        return;
    }

    // Format consistently: 712 345 678
    rawPhone = rawPhone.replace(/\s/g, '');
    const formattedPhone = `${rawPhone.slice(0, 3)} ${rawPhone.slice(3, 6)} ${rawPhone.slice(6, 9)}`;

    // Show loading
    statusEl.innerHTML = '<span class="text-warning"><i class="fas fa-spinner fa-spin me-1"></i>Adding contact...</span>';
    phoneInput.disabled = true;
    nameInput.disabled = true;

    try {
        // Normalize to +255 format for database
        const normalizedPhone = `+255${rawPhone}`;

        const response = await fetch(`${API_BASE_URL}/api/emergency-contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone_number: normalizedPhone,
                contact_name: contactName
            })
        });

        const result = await response.json();

        if (result.success) {
            showContactStatus('✅ Contact added successfully!', 'success', statusEl);

            // Clear form
            phoneInput.value = '';
            nameInput.value = '';

            // Reload contacts
            await loadEmergencyContacts();

            // Show success notification
            if (typeof Notiflix !== 'undefined') {
                Notiflix.Notify.success(`Contact "${contactName}" added!`);
            }
        } else {
            showContactStatus(`❌ ${result.message || 'Failed to add contact'}`, 'danger', statusEl);
        }
    } catch (error) {
        showContactStatus('❌ Network error. Please try again.', 'danger', statusEl);
        console.error('Add contact error:', error);
    } finally {
        phoneInput.disabled = false;
        nameInput.disabled = false;
        setTimeout(() => { statusEl.innerHTML = ''; }, 5000);
    }
}

// Save selected SMS contact
async function saveSelectedContact() {
    const contactId = document.getElementById('smsContactSelect').value;
    const statusEl = document.getElementById('smsContactStatus');

    statusEl.innerHTML = '<span class="text-warning"><i class="fas fa-spinner fa-spin me-1"></i>Saving...</span>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/emergency-contacts/settings/sms-selection`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact_id: contactId })
        });

        const result = await response.json();

        if (result.success) {
            showContactStatus('✅ SMS contact selection saved!', 'success', statusEl);

            // Update modal dropdown too
            const modalDropdown = document.getElementById('modalSmsContactSelect');
            if (modalDropdown) modalDropdown.value = contactId;

            // Show notification
            if (typeof Notiflix !== 'undefined') {
                const contactText = contactId === '0' ? 'ALL active contacts' : 'Selected contact';
                Notiflix.Notify.success(`SMS alerts will be sent to ${contactText}`);
            }

            // Auto-clear after 3 seconds
            setTimeout(() => { statusEl.innerHTML = ''; }, 3000);
        } else {
            showContactStatus(`❌ ${result.message || 'Failed to save selection'}`, 'danger', statusEl);
        }
    } catch (error) {
        showContactStatus('❌ Network error. Please try again.', 'danger', statusEl);
        console.error('Save contact error:', error);
    }
}

async function deleteContact(contactId) {
    if (!contactId) {
        console.error('No contact ID provided for deletion');
        return;
    }

    const performDelete = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/emergency-contacts/${contactId}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });

            const result = await response.json();

            if (result.success) {
                if (typeof Notiflix !== 'undefined') {
                    Notiflix.Notify.success('Contact deactivated successfully');
                } else {
                    alert('Contact deactivated successfully');
                }
                await loadEmergencyContacts();
            } else {
                const errorMsg = result.message || 'Failed to deactivate contact';
                if (typeof Notiflix !== 'undefined') {
                    Notiflix.Notify.failure(errorMsg);
                } else {
                    alert(errorMsg);
                }
            }
        } catch (error) {
            console.error('Delete contact error:', error);
            if (typeof Notiflix !== 'undefined') {
                Notiflix.Notify.failure('Error connecting to server. Please check your connection.');
            } else {
                alert('Error connecting to server.');
            }
        }
    };

    if (typeof Notiflix !== 'undefined') {
        Notiflix.Confirm.show(
            'Deactivate Contact',
            'Are you sure you want to deactivate this contact? They will no longer receive SMS alerts.',
            'Yes, Deactivate',
            'Cancel',
            performDelete,
            () => { },
            {
                okButtonBackground: '#EF4444',
                titleColor: '#EF4444'
            }
        );
    } else {
        if (confirm('Deactivate this contact? They will no longer receive SMS alerts.')) {
            performDelete();
        }
    }
}

// Helper: Show contact status messages
function showContactStatus(message, type, element) {
    element.innerHTML = `<span class="text-${type}"><i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-1"></i>${message}</span>`;
}

// Helper: Show error messages
function showError(message) {
    if (typeof Notiflix !== 'undefined') {
        Notiflix.Notify.failure(message);
    } else {
        console.error(message);
    }
}

// Initialize contact management when settings section is shown
// Load theme on startup
loadTheme();