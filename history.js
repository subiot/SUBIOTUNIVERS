// history.js - Electric Usage History with Firebase

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBggVwDQP4V-ki7rXADksto5Jzd5tOoO_I",
    authDomain: "subiot-univers.firebaseapp.com",
    databaseURL: "https://subiot-univers-default-rtdb.firebaseio.com",
    projectId: "subiot-univers",
    storageBucket: "subiot-univers.firebasestorage.app",
    messagingSenderId: "116296674465",
    appId: "1:116296674465:web:d62ad44a9dba75240dd4e0",
    measurementId: "G-XSX0C22H90"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM Elements
const backButton = document.querySelector('.back-button');
const monthlyUsageCard = document.querySelector('.summary-card:nth-child(1) .card-value');
const monthlyCostCard = document.querySelector('.summary-card:nth-child(2) .card-value');
const changePercentageCard = document.querySelector('.summary-card:nth-child(3) .card-value');
const periodButtons = document.querySelectorAll('.period-btn');
const exportBtn = document.querySelector('.export-btn');
const showMoreBtn = document.querySelector('.show-more');
const tableBody = document.querySelector('tbody');

// Chart variables
let usageChart;
let currentPeriod = 'monthly'; // 'monthly', 'weekly', 'daily', 'yearly'
let currentUserId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            initCharts();
            loadHistoryData();
            setupEventListeners();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });
});

function setupEventListeners() {
    // Period buttons
    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.textContent.toLowerCase();
            updateChartData(currentPeriod);
        });
    });

    // Export button
    exportBtn.addEventListener('click', exportData);

    // Show more rows
    showMoreBtn.addEventListener('click', toggleRows);

    // Back button
    backButton.addEventListener('click', () => {
        window.history.back();
    });
}

function initCharts() {
    const ctx = document.getElementById("usageChart").getContext("2d");
    
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
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
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
                    title: {
                        display: true,
                        text: 'kWh'
                    },
                    grid: {
                        drawOnChartArea: true,
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Biaya (Rp x1000)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}

function loadHistoryData() {
    const historyRef = database.ref(`usageHistory/${currentUserId}`);
    
    historyRef.on('value', (snapshot) => {
        const historyData = snapshot.val();
        if (historyData) {
            updateSummaryCards(historyData);
            updateTableData(historyData);
            updateChartData(currentPeriod, historyData);
        }
    });
}

function updateSummaryCards(data) {
    // Current month data
    const months = Object.keys(data.monthly || {}).sort();
    const currentMonth = months[months.length - 1];
    const prevMonth = months[months.length - 2];
    
    if (currentMonth && data.monthly[currentMonth]) {
        const currentUsage = data.monthly[currentMonth].usage || 0;
        const currentCost = data.monthly[currentMonth].cost || 0;
        
        monthlyUsageCard.textContent = `${currentUsage.toFixed(0)} kWh`;
        monthlyCostCard.textContent = `Rp ${formatNumber(currentCost.toFixed(0))}`;
        
        // Calculate percentage change
        if (prevMonth && data.monthly[prevMonth]) {
            const prevUsage = data.monthly[prevMonth].usage || 0;
            const change = ((currentUsage - prevUsage) / prevUsage * 100).toFixed(0);
            changePercentageCard.textContent = `${change}%`;
            changePercentageCard.style.color = change >= 0 ? '#dc3545' : '#28a745'; // Red for increase, green for decrease
        }
    }
}

function updateTableData(data) {
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add rows for each month
    const months = Object.keys(data.monthly || {}).sort().reverse();
    
    months.forEach((month, index) => {
        const monthData = data.monthly[month];
        const row = document.createElement('tr');
        
        // Hide rows beyond the first 3
        if (index >= 3) {
            row.classList.add('hidden-row');
        }
        
        row.innerHTML = `
            <td>${formatMonth(month)}</td>
            <td>${monthData.usage ? monthData.usage.toFixed(0) : 0} kWh</td>
            <td>Rp ${monthData.cost ? formatNumber(monthData.cost.toFixed(0)) : 0}</td>
            <td><span class="status-badge ${monthData.paid ? 'paid' : 'pending'}">${monthData.paid ? 'Lunas' : 'Proses'}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

function updateChartData(period, data) {
    if (!data) {
        // If no data provided, we might be just changing the period
        // You could load specific period data from Firebase here
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
            // Example for weekly data - you would need to structure your data accordingly
            labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
            usageData = [75, 80, 85, 90]; // Example data
            costData = [112.5, 120, 127.5, 135]; // Example data (cost/1000)
            break;
            
        case 'daily':
            // Example for daily data
            labels = Array.from({length: 7}, (_, i) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][i]);
            usageData = [10, 12, 11, 13, 14, 12, 9]; // Example data
            costData = [15, 18, 16.5, 19.5, 21, 18, 13.5]; // Example data (cost/1000)
            break;
            
        case 'yearly':
            // Example for yearly data
            labels = ['2020', '2021', '2022', '2023', '2024'];
            usageData = [2500, 2700, 2900, 3100, 3300]; // Example data
            costData = [3750, 4050, 4350, 4650, 4950]; // Example data (cost/1000)
            break;
    }
    
    // Update chart
    usageChart.data.labels = labels;
    usageChart.data.datasets[0].data = usageData;
    usageChart.data.datasets[1].data = costData;
    usageChart.update();
}

function exportData() {
    // Get all history data
    const historyRef = database.ref(`usageHistory/${currentUserId}`);
    
    historyRef.once('value').then(snapshot => {
        const historyData = snapshot.val();
        if (!historyData) {
            alert('Tidak ada data untuk diexport');
            return;
        }
        
        // Convert to CSV
        let csv = 'Bulan,kWh,Biaya,Status\n';
        
        const months = Object.keys(historyData.monthly || {}).sort().reverse();
        months.forEach(month => {
            const monthData = historyData.monthly[month];
            csv += `${formatMonth(month)},${monthData.usage || 0},${monthData.cost || 0},${monthData.paid ? 'Lunas' : 'Proses'}\n`;
        });
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `riwayat-listrik-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function toggleRows() {
    const hiddenRows = document.querySelectorAll(".hidden-row");
    hiddenRows.forEach(row => {
        row.style.display = (row.style.display === "table-row") ? "none" : "table-row";
    });

    const icon = showMoreBtn.querySelector("i");
    if (showMoreBtn.textContent.includes("Tampilkan")) {
        showMoreBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Sembunyikan';
    } else {
        showMoreBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Tampilkan Lebih Banyak';
    }
}

// Helper functions
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatMonth(monthStr, short = false) {
    // Expected format: "YYYY-MM"
    const [year, month] = monthStr.split('-');
    const monthNames = short ? 
        ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] :
        ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
         'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}