// ==========================================
// GAS LEAK DETECTION DASHBOARD - JAVASCRIPT
// Real-time monitoring with Theme System
// ==========================================

// Configuration
const API_BASE_URL = 'http://localhost:3000';
let currentPage = 1;
let itemsPerPage = 10;
let autoRefreshInterval = 2000; // 2 seconds
let chart = null;
let currentTheme = 'light'; // Default theme
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

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load saved theme
    loadTheme();
    
    initializeDashboard();
    setupEventListeners();
    
    // Start real-time updates
    setInterval(fetchRealTimeData, autoRefreshInterval);
    setInterval(fetchIncidents, autoRefreshInterval);
});

// ===== THEME MANAGEMENT =====

// Load theme from localStorage
function loadTheme() {
    const savedTheme = localStorage.getItem('gasMonitorTheme') || 'light';
    setTheme(savedTheme, false);
    updateThemeDisplay(savedTheme);
}

// Set theme
function setTheme(theme, showToast = true) {
    currentTheme = theme;
    
    // Update HTML attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update theme buttons
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.theme-option[data-theme="${theme}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Update theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeText.textContent = 'Light Mode';
    } else {
        themeIcon.className = 'fas fa-moon';
        themeText.textContent = 'Dark Mode';
    }
    
    // Update select dropdown
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = theme;
    }
    
    // Save to localStorage
    localStorage.setItem('gasMonitorTheme', theme);
    
    // Update theme display
    updateThemeDisplay(theme);
    
    // Show toast notification
    if (showToast) {
        showToastMessage(`Switched to ${theme === 'dark' ? 'Dark' : 'Light'} Mode`);
    }
    
    // Update chart colors based on theme
    updateChartTheme();
}

// Toggle between light and dark theme
function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Update theme display text
function updateThemeDisplay(theme) {
    const display = document.getElementById('currentThemeDisplay');
    if (display) {
        display.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }
}

// Update chart colors based on theme
function updateChartTheme() {
    if (!chart) return;
    
    if (currentTheme === 'dark') {
        chart.options.scales.x.grid.color = 'rgba(255, 255, 255, 0.1)';
        chart.options.scales.x.ticks.color = '#94A3B8';
        chart.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.1)';
        chart.options.scales.y.ticks.color = '#94A3B8';
        chart.options.plugins.legend.labels.color = '#F1F5F9';
        chart.options.plugins.tooltip.backgroundColor = '#1E293B';
        chart.options.plugins.tooltip.titleColor = '#38BDF8';
        chart.options.plugins.tooltip.bodyColor = '#F1F5F9';
    } else {
        chart.options.scales.x.grid.color = 'rgba(0, 0, 0, 0.1)';
        chart.options.scales.x.ticks.color = '#6c757d';
        chart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.1)';
        chart.options.scales.y.ticks.color = '#6c757d';
        chart.options.plugins.legend.labels.color = '#212529';
        chart.options.plugins.tooltip.backgroundColor = '#ffffff';
        chart.options.plugins.tooltip.titleColor = '#38BDF8';
        chart.options.plugins.tooltip.bodyColor = '#212529';
    }
    
    chart.update();
}

// Show toast message
function showToastMessage(message) {
    const toastEl = document.getElementById('themeToast');
    const toastMessage = document.getElementById('themeToastMessage');
    
    if (toastMessage && toastEl) {
        toastMessage.textContent = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
}

// ===== DASHBOARD INITIALIZATION =====

// Initialize dashboard
function initializeDashboard() {
    // Initialize chart
    const ctx = document.getElementById('gasChart').getContext('2d');
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
                        font: {
                            size: 14
                        }
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
                    grid: {
                        color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#94A3B8' : '#6c757d'
                    }
                },
                y: {
                    grid: {
                        color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#94A3B8' : '#6c757d',
                        beginAtZero: true
                    },
                    title: {
                        display: true,
                        text: 'PPM',
                        color: currentTheme === 'dark' ? '#F1F5F9' : '#212529'
                    }
                }
            }
        }
    });

    // Initial data fetch
    fetchRealTimeData();
    fetchIncidents();
    fetchStatistics();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', refreshAllData);
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('filterStatus').addEventListener('change', filterTable);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('themeSelect').addEventListener('change', function() {
        setTheme(this.value);
    });
}

// ===== DATA FETCHING =====

// Fetch real-time data
async function fetchRealTimeData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sensor/latest`);
        const data = await response.json();
        
        if (data.success) {
            updateCurrentReading(data.data);
            updateChart(data.data);
            updateConnectionStatus(true);
        } else {
            updateConnectionStatus(false);
        }
    } catch (error) {
        console.error('Error fetching real-time data:', error);
        updateConnectionStatus(false);
    }
}

// Fetch incidents list
async function fetchIncidents() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/incidents?page=${currentPage}&limit=${itemsPerPage}`);
        const data = await response.json();
        
        if (data.success) {
            populateTable(data.data.incidents);
            setupPagination(data.data.total, data.data.page, data.data.limit);
        }
    } catch (error) {
        console.error('Error fetching incidents:', error);
    }
}

// Fetch statistics
async function fetchStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/statistics`);
        const data = await response.json();
        
        if (data.success) {
            updateStatistics(data.data);
        }
    } catch (error) {
        console.error('Error fetching statistics:', error);
    }
}

// ===== UI UPDATES =====

// Update current reading display
function updateCurrentReading(data) {
    const gasLevel = data.gas_level || 0;
    const status = data.status || 'NORMAL';
    
    document.getElementById('currentGasLevel').textContent = gasLevel;
    document.getElementById('currentStatus').textContent = status;
    
    // Update status styling
    const statusElement = document.getElementById('currentStatus');
    statusElement.className = 'reading-status';
    
    if (gasLevel > 800) {
        statusElement.classList.add('danger');
    } else if (gasLevel > 400) {
        statusElement.classList.add('warning');
    }
    
    // Show/hide alert banner
    if (status === 'ALERT' && gasLevel > 400) {
        showAlertBanner(gasLevel);
    } else {
        closeAlert();
    }
}

// Update chart with new data
function updateChart(data) {
    const gasLevel = data.gas_level || 0;
    const timestamp = new Date(data.timestamp || Date.now()).toLocaleTimeString();
    
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
    
    chart.update();
}

// Populate incidents table
function populateTable(incidents) {
    const tbody = document.getElementById('tableBody');
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
        
        // Format timestamp
        const date = new Date(incident.timestamp);
        const formattedTime = date.toLocaleString();
        
        // Determine status class
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

// Setup pagination
function setupPagination(totalItems, currentPage, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
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

// Change page
function changePage(page) {
    currentPage = page;
    fetchIncidents();
}

// Update statistics
function updateStatistics(stats) {
    document.getElementById('alertsToday').textContent = stats.alertsToday || 0;
    document.getElementById('totalRecords').textContent = stats.totalRecords || 0;
    document.getElementById('totalRecordsBottom').textContent = stats.totalRecords || 0;
    
    if (stats.lastAlert) {
        const date = new Date(stats.lastAlert);
        document.getElementById('lastAlert').textContent = date.toLocaleString();
    } else {
        document.getElementById('lastAlert').textContent = 'Never';
    }
}

// Update connection status
function updateConnectionStatus(isConnected) {
    const statusDot = document.getElementById('connectionStatus');
    const statusText = document.getElementById('connectionText');
    
    if (isConnected) {
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Connected';
        statusText.style.color = '#22C55E';
    } else {
        statusDot.className = 'status-dot';
        statusText.textContent = 'Disconnected';
        statusText.style.color = '#EF4444';
    }
    
    // Update sensor status
    const sensorDot = document.getElementById('sensorStatus');
    const sensorText = document.getElementById('sensorText');
    
    if (isConnected) {
        sensorDot.className = 'status-dot online';
        sensorText.textContent = 'Active';
        sensorText.style.color = '#22C55E';
    } else {
        sensorDot.className = 'status-dot';
        sensorText.textContent = 'Offline';
        sensorText.style.color = '#EF4444';
    }
}

// Show alert banner
function showAlertBanner(gasLevel) {
    const banner = document.getElementById('alertBanner');
    const alertLevel = document.getElementById('alertLevel');
    
    alertLevel.textContent = gasLevel;
    banner.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        closeAlert();
    }, 10000);
}

// Close alert banner
function closeAlert() {
    document.getElementById('alertBanner').style.display = 'none';
}

// ===== ACTIONS =====

// Refresh all data
function refreshAllData() {
    fetchRealTimeData();
    fetchIncidents();
    fetchStatistics();
    
    // Show feedback
    const btn = document.getElementById('refreshBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-sync-alt fa-spin me-2"></i>Refreshing...';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 1000);
}

// Clear logs
async function clearLogs() {
    if (!confirm('Are you sure you want to clear all incident logs? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/incidents/clear`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Logs cleared successfully!');
            fetchIncidents();
            fetchStatistics();
        } else {
            alert('Failed to clear logs: ' + data.message);
        }
    } catch (error) {
        console.error('Error clearing logs:', error);
        alert('An error occurred while clearing logs');
    }
}

// Export data
async function exportData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/incidents/export`);
        const data = await response.json();
        
        if (data.success) {
            // Create CSV
            const csvContent = convertToCSV(data.data);
            downloadCSV(csvContent, 'gas_incidents_export.csv');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Failed to export data');
    }
}

// Convert JSON to CSV
function convertToCSV(data) {
    const headers = ['ID', 'Gas Level', 'Status', 'Timestamp'];
    const rows = data.map(item => 
        [item.id, item.gas_level, item.status, item.timestamp].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

// Download CSV file
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Filter table
function filterTable() {
    const filterValue = document.getElementById('filterStatus').value;
    currentPage = 1;
    fetchIncidents();
}

// Save settings
function saveSettings() {
    const threshold = document.getElementById('thresholdInput').value;
    const interval = document.getElementById('refreshInterval').value;
    const port = document.getElementById('bluetoothPort').value;
    const endpoint = document.getElementById('apiEndpoint').value;
    const theme = document.getElementById('themeSelect').value;
    
    // Save to localStorage
    localStorage.setItem('gasThreshold', threshold);
    localStorage.setItem('refreshInterval', interval);
    localStorage.setItem('bluetoothPort', port);
    localStorage.setItem('apiEndpoint', endpoint);
    localStorage.setItem('gasMonitorTheme', theme);
    
    // Apply theme if changed
    if (theme !== currentTheme) {
        setTheme(theme);
    }
    
    autoRefreshInterval = parseInt(interval) * 1000;
    
    alert('Settings saved successfully!');
}

// View incident details
function viewIncident(id) {
    alert(`Viewing incident details for ID: ${id}\n\nThis would open a modal with detailed information.`);
}

// Delete incident
async function deleteIncident(id) {
    if (!confirm(`Are you sure you want to delete incident #${id}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/incidents/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Incident deleted successfully!');
            fetchIncidents();
            fetchStatistics();
        } else {
            alert('Failed to delete incident: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting incident:', error);
        alert('An error occurred while deleting the incident');
    }
}

// Handle API errors gracefully
window.addEventListener('error', function(e) {
    console.error('Unhandled error:', e.message);
});