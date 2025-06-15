// Firebase Configuration
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

// DOM Elements with null checks
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
    },
    chartContainer: document.getElementById('chart-container')
};

// Chart and state variables
let usageChart = null;
let currentPeriod = 'monthly';
let currentUser = null;
let userPresenceRef = null;

// Initialize the application with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        auth.onAuthStateChanged(user => {
            try {
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
            } catch (e) {
                console.error("Error in auth state change handler:", e);
                showErrorUI();
            }
        }, error => {
            console.error("Auth state change error:", error);
            showErrorUI();
        });
    } catch (e) {
        console.error("DOMContentLoaded error:", e);
        showErrorUI();
    }
});

// Setup event listeners with proper error handling
function setupEventListeners() {
    try {
        // Period buttons
        if (elements.periodButtons && elements.periodButtons.length) {
            elements.periodButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    try {
                        elements.periodButtons.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        currentPeriod = btn.dataset.period || 'monthly';
                        updateChartData(currentPeriod);
                    } catch (e) {
                        console.error("Error handling period button click:", e);
                    }
                });
            });
        }

        // Export button
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', exportData);
        }

        // Show more rows
        if (elements.showMoreBtn) {
            elements.showMoreBtn.addEventListener('click', toggleRows);
        }

        // Back button - Navigates to dashboard.html
        if (elements.backButton) {
            elements.backButton.addEventListener('click', () => {
                try {
                    updateUserLocation('Dashboard');
                    window.location.href = 'dashboard.html'; // Direct navigation
                } catch (e) {
                    console.error("Error handling back button click:", e);
                }
            });
        }

        // Profile click
        if (elements.profile.img) {
            elements.profile.img.addEventListener('click', () => {
                updateUserLocation('Profile Page');
                window.location.href = 'profil.html';
            });
        }

    } catch (e) {
        console.error("Error setting up event listeners:", e);
    }
}

// Initialize charts with proper cleanup
function initCharts() {
    try {
        const canvas = document.getElementById("usageChart");
        
        if (!canvas) {
            console.error("Canvas element 'usageChart' not found!");
            if (elements.chartContainer) {
                elements.chartContainer.innerHTML = 
                    '<p class="error-message">Elemen grafik tidak ditemukan</p>';
            }
            return;
        }
        
        // Destroy existing chart properly
        if (usageChart instanceof Chart) {
            try {
                usageChart.destroy();
            } catch (e) {
                console.error("Error destroying chart:", e);
            } finally {
                usageChart = null;
            }
        }
        
        // Clear canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Create new chart with animation frame
        requestAnimationFrame(() => {
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
                if (elements.chartContainer) {
                    elements.chartContainer.innerHTML = 
                        '<p class="error-message">Gagal memuat grafik. Silakan refresh halaman.</p>';
                }
            }
        });
        
    } catch (e) {
        console.error("Error initializing charts:", e);
    }
}

// Chart configuration options
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
    try {
        if (!currentUser) return;
        
        const historyRef = database.ref(`usageHistory/${currentUser.uid}`);
        
        historyRef.on('value', (snapshot) => {
            try {
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
            } catch (e) {
                console.error("Error processing history data:", e);
            }
        }, error => {
            console.error("Error reading history data:", error);
        });
    } catch (e) {
        console.error("Error in loadHistoryData:", e);
    }
}

// Update summary cards with data
function updateSummaryCards(data) {
    try {
        if (!data || !data.monthly || !elements.summaryCards) return;
        
        const months = Object.keys(data.monthly || {}).sort();
        const currentMonth = months[months.length - 1];
        const prevMonth = months[months.length - 2];
        
        if (currentMonth && data.monthly[currentMonth]) {
            const currentUsage = data.monthly[currentMonth].usage || 0;
            const currentCost = data.monthly[currentMonth].cost || 0;
            
            if (elements.summaryCards.usage) {
                elements.summaryCards.usage.textContent = `${currentUsage.toFixed(0)} kWh`;
            }
            if (elements.summaryCards.cost) {
                elements.summaryCards.cost.textContent = `Rp ${formatNumber(currentCost.toFixed(0))}`;
            }
            
            if (prevMonth && data.monthly[prevMonth] && elements.summaryCards.change) {
                const prevUsage = data.monthly[prevMonth].usage || 0;
                const change = prevUsage > 0 ? ((currentUsage - prevUsage) / prevUsage * 100).toFixed(0) : 0;
                elements.summaryCards.change.textContent = `${change}%`;
                elements.summaryCards.change.style.color = change >= 0 ? '#dc3545' : '#28a745';
            }
        }
    } catch (e) {
        console.error("Error updating summary cards:", e);
    }
}

// Update table with history data
function updateTableData(data) {
    try {
        if (!elements.tableBody) return;
        
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
    } catch (e) {
        console.error("Error updating table data:", e);
    }
}

// Update chart with period-specific data
function updateChartData(period, data) {
    try {
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
                usageData = months.map(m => data.monthly[m]?.usage || 0);
                costData = months.map(m => (data.monthly[m]?.cost || 0) / 1000);
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
    } catch (e) {
        console.error("Error updating chart data:", e);
    }
}

// Export data to CSV
function exportData() {
    try {
        if (!currentUser) return;
        
        const historyRef = database.ref(`usageHistory/${currentUser.uid}`);
        
        historyRef.once('value').then(snapshot => {
            try {
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
            } catch (e) {
                console.error("Error processing export data:", e);
                alert('Gagal mengekspor data');
            }
        }).catch(error => {
            console.error("Error exporting data:", error);
            alert('Gagal mengambil data untuk diekspor');
        });
    } catch (e) {
        console.error("Error in exportData:", e);
    }
}

// Download CSV file
function downloadCSV(content, filename) {
    try {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Error downloading CSV:", e);
        alert('Gagal mengunduh file CSV');
    }
}

// Toggle visibility of additional rows
function toggleRows() {
    try {
        if (!elements.showMoreBtn) return;
        
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
    } catch (e) {
        console.error("Error toggling rows:", e);
    }
}

// User presence system
function setupPresenceSystem() {
    try {
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
    } catch (e) {
        console.error("Error setting up presence system:", e);
    }
}

// Set user presence information
function setUserPresence(location) {
    try {
        if (!currentUser || !userPresenceRef) return;
        
        database.ref(`users/${currentUser.uid}`).once('value').then(snapshot => {
            try {
                const userData = snapshot.val();
                
                userPresenceRef.update({
                    name: userData?.name || currentUser.displayName || 'User',
                    avatar: userData?.profileImage || currentUser.photoURL || 'assets/img/default-profile.png',
                    location: location || 'History Page',
                    lastActive: firebase.database.ServerValue.TIMESTAMP,
                    nim: userData?.nim || 'N/A'
                });
            } catch (e) {
                console.error("Error updating presence data:", e);
            }
        }).catch(error => {
            console.error("Error reading user data:", error);
        });
    } catch (e) {
        console.error("Error in setUserPresence:", e);
    }
}

// Update user location in presence system
function updateUserLocation(location) {
    try {
        if (userPresenceRef) {
            userPresenceRef.update({
                location: location,
                lastActive: firebase.database.ServerValue.TIMESTAMP
            });
        }
    } catch (e) {
        console.error("Error updating user location:", e);
    }
}

// Update profile information in UI
function updateProfileInfo() {
    try {
        if (!currentUser) return;
        
        database.ref(`users/${currentUser.uid}`).once('value').then(snapshot => {
            try {
                const userData = snapshot.val();
                if (userData && elements.profile.name) {
                    elements.profile.name.textContent = userData.name || currentUser.displayName || 'User';
                }
                if (userData && elements.profile.img) {
                    elements.profile.img.src = userData.profileImage || 
                                            currentUser.photoURL || 
                                            'assets/img/default-profile.png';
                }
            } catch (e) {
                console.error("Error processing profile data:", e);
            }
        }).catch(error => {
            console.error("Error reading profile data:", error);
        });
    } catch (e) {
        console.error("Error in updateProfileInfo:", e);
    }
}

// Helper function to format numbers with thousand separators
function formatNumber(num) {
    try {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    } catch (e) {
        console.error("Error formatting number:", e);
        return num;
    }
}

// Helper function to format month names
function formatMonth(monthStr, short = false) {
    try {
        const [year, month] = monthStr.split('-');
        const monthNames = short ? 
            ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] :
            ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
             'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    } catch (e) {
        console.error("Error formatting month:", e);
        return monthStr;
    }
}

// Initialize empty data structure
function initializeEmptyData() {
    try {
        console.log("Initializing empty data structure");
        // You can add UI elements to show empty state here
    } catch (e) {
        console.error("Error initializing empty data:", e);
    }
}

// Show error UI
function showErrorUI() {
    try {
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Terjadi Kesalahan</h2>
                    <p>Maaf, kami mengalami masalah saat memuat data. Silakan coba lagi.</p>
                    <button onclick="window.location.reload()">Muat Ulang</button>
                </div>
            `;
        }
    } catch (e) {
        console.error("Error showing error UI:", e);
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    try {
        if (usageChart) {
            usageChart.destroy();
        }
    } catch (e) {
        console.error("Error during cleanup:", e);
    }
});