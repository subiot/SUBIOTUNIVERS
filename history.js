// history.js - Electric Usage History with Firebase (Enhanced Version)

// Firebase Configuration (consistent with other pages)
const firebaseConfig = {
    apiKey: "AIzaSyBggVwDQP4V-ki7rXADksto5Jzd5tOoO_I",
    authDomain: "subiot-univers.firebaseapp.com",
    databaseURL: "https://subiot-univers-default-rtdb.firebaseio.com",
    projectId: "subiot-univers",
    storageBucket: "subiot-univers.appspot.com",
    messagingSenderId: "116296674465",
    appId: "1:116296674465:web:d62ad44a9dba75240dd4e0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM Elements
const elements = {
    backButton: document.querySelector('.back-button'),
    summaryCards: {
        usage: document.querySelector('.summary-card:nth-child(1) .card-value'),
        cost: document.querySelector('.summary-card:nth-child(2) .card-value'),
        change: document.querySelector('.summary-card:nth-child(3) .card-value')
    },
    periodButtons: document.querySelectorAll('.period-btn'),
    exportBtn: document.querySelector('.export-btn'),
    showMoreBtn: document.querySelector('.show-more'),
    tableBody: document.querySelector('tbody'),
    profile: {
        name: document.querySelector('.profile-name'),
        img: document.querySelector('.profile-img')
    }
};

// Chart and state variables
let usageChart = null;
let currentPeriod = 'monthly';
let currentUser = null;
let userPresenceRef = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            updateProfileInfo();
            setupPresenceSystem();
            initCharts();
            loadHistoryData();
            setupEventListeners();
        } else {
            window.location.href = 'index.html';
        }
    });
});

// Setup event listeners
function setupEventListeners() {
    // Period buttons
    elements.periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period || 'monthly';
            updateChartData(currentPeriod);
        });
    });

    // Export button
    elements.exportBtn.addEventListener('click', exportData);

    // Show more rows
    elements.showMoreBtn.addEventListener('click', toggleRows);

    // Back button
    elements.backButton.addEventListener('click', () => {
        updateUserLocation('Dashboard');
        window.history.back();
    });

    // Profile click (if exists)
    if (elements.profile.img) {
        elements.profile.img.addEventListener('click', () => {
            updateUserLocation('Profile Page');
            window.location.href = 'profile.html';
        });
    }
}

// Initialize charts
function initCharts() {
    const canvas = document.getElementById("usageChart");
    
    // Check if canvas exists
    if (!canvas) {
        console.error("Canvas element 'usageChart' not found!");
        return;
    }
    
    // Properly destroy existing chart
    if (usageChart instanceof Chart) {
        try {
            usageChart.destroy();
            usageChart = null;
        } catch (e) {
            console.error("Error destroying chart:", e);
        }
    }
    
    // Clear canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create new chart
    try {
        usageChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Pemakaian (kWh)",
                        data: [],
                        borderColor: "#4361ee",
                        backgroundColor: "rgba(67, 97, 238, 0.1)",
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: "Biaya (Rp x1000)",
                        data: [],
                        borderColor: "#4cc9f0",
                        backgroundColor: "rgba(76, 201, 240, 0.1)",
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: getChartOptions()
        });
    } catch (e) {
        console.error("Error creating chart:", e);
    }
}

function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.datasetIndex === 1) {
                            label += 'Rp ' + context.raw + '.000';
                        } else {
                            label += context.raw + ' kWh';
                        }
                        return label;
                    }
                }
            },
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 12,
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'kWh' },
                grid: { drawOnChartArea: true }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Biaya (Rp x1000)' },
                grid: { drawOnChartArea: false }
            }
        }
    };
}

// Load history data from Firebase
function loadHistoryData() {
    const historyRef = database.ref(`usageHistory/${currentUser.uid}`);
    
    historyRef.on('value', (snapshot) => {
        const historyData = snapshot.val();
        if (historyData) {
            updateSummaryCards(historyData);
            updateTableData(historyData);
            
            if (!usageChart) {
                initCharts();
            }
            updateChartData(currentPeriod, historyData);
        } else {
            console.log("No history data available");
            initializeEmptyData();
        }
    });
}

function updateSummaryCards(data) {
    const months = Object.keys(data.monthly || {}).sort();
    const currentMonth = months[months.length - 1];
    const prevMonth = months[months.length - 2];
    
    if (currentMonth && data.monthly[currentMonth]) {
        const currentUsage = data.monthly[currentMonth].usage || 0;
        const currentCost = data.monthly[currentMonth].cost || 0;
        
        elements.summaryCards.usage.textContent = `${currentUsage.toFixed(0)} kWh`;
        elements.summaryCards.cost.textContent = `Rp ${formatNumber(currentCost.toFixed(0))}`;
        
        if (prevMonth && data.monthly[prevMonth]) {
            const prevUsage = data.monthly[prevMonth].usage || 0;
            const change = prevUsage > 0 ? ((currentUsage - prevUsage) / prevUsage * 100).toFixed(0) : 0;
            elements.summaryCards.change.textContent = `${change}%`;
            elements.summaryCards.change.style.color = change >= 0 ? '#dc3545' : '#28a745';
        }
    }
}

function updateTableData(data) {
    elements.tableBody.innerHTML = '';
    
    const months = Object.keys(data.monthly || {}).sort().reverse();
    
    months.forEach((month, index) => {
        const monthData = data.monthly[month];
        const row = document.createElement('tr');
        
        if (index >= 3) row.classList.add('hidden-row');
        
        row.innerHTML = `
            <td>${formatMonth(month)}</td>
            <td>${monthData.usage?.toFixed(0) || 0} kWh</td>
            <td>Rp ${monthData.cost ? formatNumber(monthData.cost.toFixed(0)) : 0}</td>
            <td><span class="status-badge ${monthData.paid ? 'paid' : 'pending'}">${
                monthData.paid ? 'Lunas' : 'Proses'
            }</span></td>
        `;
        
        elements.tableBody.appendChild(row);
    });
}

function updateChartData(period, data) {
    if (!data) {
        console.log("No data available for chart");
        return;
    }
    
    if (!usageChart) {
        initCharts();
        return;
    }
    
    let labels = [];
    let usageData = [];
    let costData = [];
    
    switch (period) {
        case 'monthly':
            const months = Object.keys(data.monthly || {}).sort();
            labels = months.map(m => formatMonth(m, true));
            usageData = months.map(m => data.monthly[m].usage || 0);
            costData = months.map(m => (data.monthly[m].cost || 0) / 1000);
            break;
            
        case 'weekly':
            // Implement weekly data logic
            break;
            
        case 'daily':
            // Implement daily data logic
            break;
            
        case 'yearly':
            // Implement yearly data logic
            break;
    }
    
    usageChart.data.labels = labels;
    usageChart.data.datasets[0].data = usageData;
    usageChart.data.datasets[1].data = costData;
    usageChart.update();
}

function exportData() {
    const historyRef = database.ref(`usageHistory/${currentUser.uid}`);
    
    historyRef.once('value').then(snapshot => {
        const historyData = snapshot.val();
        if (!historyData) {
            alert('Tidak ada data untuk diexport');
            return;
        }
        
        let csv = 'Bulan,kWh,Biaya,Status\n';
        const months = Object.keys(historyData.monthly || {}).sort().reverse();
        
        months.forEach(month => {
            const monthData = historyData.monthly[month];
            csv += `${formatMonth(month)},${monthData.usage || 0},${monthData.cost || 0},${
                monthData.paid ? 'Lunas' : 'Proses'
            }\n`;
        });
        
        downloadCSV(csv, `riwayat-listrik-${new Date().toISOString().slice(0, 10)}.csv`);
    });
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleRows() {
    const hiddenRows = document.querySelectorAll(".hidden-row");
    const icon = elements.showMoreBtn.querySelector("i");
    
    hiddenRows.forEach(row => {
        row.style.display = row.style.display === "table-row" ? "none" : "table-row";
    });

    if (elements.showMoreBtn.textContent.includes("Tampilkan")) {
        elements.showMoreBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Sembunyikan';
    } else {
        elements.showMoreBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Tampilkan Lebih Banyak';
    }
}

// User presence system
function setupPresenceSystem() {
    if (!currentUser) return;
    
    const db = firebase.database();
    userPresenceRef = db.ref(`onlineUsers/${currentUser.uid}`);
    const userStatusRef = db.ref(`status/${currentUser.uid}`);
    
    // Set initial status
    setUserPresence('History Page');
    
    // Handle disconnect
    db.ref(`status/${currentUser.uid}`).onDisconnect().update({
        online: false,
        lastChanged: firebase.database.ServerValue.TIMESTAMP
    });
    
    db.ref(`onlineUsers/${currentUser.uid}`).onDisconnect().remove();
}

function setUserPresence(location) {
    if (!currentUser || !userPresenceRef) return;
    
    database.ref(`users/${currentUser.uid}`).once('value').then(snapshot => {
        const userData = snapshot.val();
        
        userPresenceRef.update({
            name: userData?.name || currentUser.displayName || 'User',
            avatar: userData?.profileImage || currentUser.photoURL || 'assets/img/default-profile.png',
            location: location || 'History Page',
            lastActive: firebase.database.ServerValue.TIMESTAMP,
            nim: userData?.nim || 'N/A'
        });
    });
}

function updateUserLocation(location) {
    if (userPresenceRef) {
        userPresenceRef.update({
            location: location,
            lastActive: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

function updateProfileInfo() {
    if (!currentUser) return;
    
    database.ref(`users/${currentUser.uid}`).once('value').then(snapshot => {
        const userData = snapshot.val();
        if (userData && elements.profile.name) {
            elements.profile.name.textContent = userData.name || currentUser.displayName || 'User';
        }
        if (userData && elements.profile.img) {
            elements.profile.img.src = userData.profileImage || 
                                      currentUser.photoURL || 
                                      'assets/img/default-profile.png';
        }
    });
}

// Helper functions
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatMonth(monthStr, short = false) {
    const [year, month] = monthStr.split('-');
    const monthNames = short ? 
        ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] :
        ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
         'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function initializeEmptyData() {
    console.log("Initializing empty data structure");
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (usageChart) {
        usageChart.destroy();
    }
});