// ws22.js - Workshop 2.2 Control Panel with Firebase Realtime Database

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
const powerConsumptionEl = document.getElementById('power-consumption');
const powerLevelEl = document.getElementById('power-level');
const powerStatusEl = document.getElementById('power-status');
const activeDevicesEl = document.getElementById('active-devices');
const roomStatusEl = document.getElementById('room-status');
const lastActivityEl = document.getElementById('last-activity');
const currentTimeEl = document.getElementById('current-time');
const currentDateEl = document.getElementById('current-date');

// Device elements
const deviceElements = {
    'main-light': {
        switch: document.getElementById('main-light-switch'),
        status: document.getElementById('main-light-status')
    },
    'work-light': {
        switch: document.getElementById('work-light-switch'),
        status: document.getElementById('work-light-status')
    },
    'emergency-light': {
        switch: document.getElementById('emergency-light-switch'),
        status: document.getElementById('emergency-light-status')
    },
    'ac1': {
        switch: document.getElementById('ac1-switch'),
        status: document.getElementById('ac1-status')
    },
    'ac2': {
        switch: document.getElementById('ac2-switch'),
        status: document.getElementById('ac2-status')
    },
    'fan': {
        switch: document.getElementById('fan-switch'),
        status: document.getElementById('fan-status')
    },
    'cctv1': {
        switch: document.getElementById('cctv1-switch'),
        status: document.getElementById('cctv1-status')
    },
    'cctv2': {
        switch: document.getElementById('cctv2-switch'),
        status: document.getElementById('cctv2-status')
    },
    'dispenser': {
        switch: document.getElementById('dispenser-switch'),
        status: document.getElementById('dispenser-status')
    }
};

// Device power consumption data
const devicePowerData = {
    'main-light': { power: 200, type: 'light' },
    'work-light': { power: 150, type: 'light' },
    'emergency-light': { power: 100, type: 'light' },
    'ac1': { power: 1800, type: 'climate' },
    'ac2': { power: 1800, type: 'climate' },
    'fan': { power: 120, type: 'climate' },
    'cctv1': { power: 30, type: 'security' },
    'cctv2': { power: 30, type: 'security' },
    'dispenser': { power: 800, type: 'utility' }
};

// Current user and room reference
let currentUserId = null;
let roomRef = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            initializeRoom();
            setupEventListeners();
            updateTime();
            setInterval(updateTime, 1000);
        } else {
            window.location.href = 'login.html';
        }
    });
});

function initializeRoom() {
    // Reference to Workshop 2.2 in Firebase
    roomRef = database.ref(`workshops/ws22`);
    
    // Listen for device status changes
    roomRef.child('devices').on('value', (snapshot) => {
        const devicesData = snapshot.val();
        if (devicesData) {
            // Update all devices from Firebase data
            for (const deviceId in devicesData) {
                if (deviceElements[deviceId]) {
                    const status = devicesData[deviceId].status || false;
                    updateDeviceUI(deviceId, status);
                }
            }
            updateDashboard();
        }
    });
    
    // Listen for room status changes
    roomRef.child('status').on('value', (snapshot) => {
        const statusData = snapshot.val();
        if (statusData) {
            updateRoomStatusUI(statusData);
        }
    });
}

function setupEventListeners() {
    // Add click handlers for all device cards
    for (const deviceId in deviceElements) {
        const card = deviceElements[deviceId].status.closest('.device-card');
        if (card) {
            card.addEventListener('click', () => toggleDevice(deviceId));
        }
    }
    
    // Add change handlers for all toggle switches
    for (const deviceId in deviceElements) {
        if (deviceElements[deviceId].switch) {
            deviceElements[deviceId].switch.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent card click from triggering
                toggleDevice(deviceId);
            });
        }
    }
    
    // Navigation buttons
    const backBtn = document.querySelector('.back-btn');
    const profileBtn = document.querySelector('.profile-btn');
    
    if (backBtn) backBtn.addEventListener('click', goBack);
    if (profileBtn) profileBtn.addEventListener('click', goToProfile);
}

// Toggle device status in Firebase
function toggleDevice(deviceId) {
    if (!roomRef) return;
    
    // Get current status from UI (opposite of current since we're toggling)
    const currentStatus = deviceElements[deviceId]?.switch?.checked || false;
    const newStatus = !currentStatus;
    
    // Update in Firebase - FIXED THE TYPO HERE (changed 'devices' to 'devices')
    roomRef.child(`devices/${deviceId}`).update({
        status: newStatus,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Also update room activity timestamp
    roomRef.child('status').update({
        lastActivity: firebase.database.ServerValue.TIMESTAMP
    });
}

// Update device UI based on status
function updateDeviceUI(deviceId, status) {
    const element = deviceElements[deviceId];
    if (!element) return;
    
    if (element.switch) {
        element.switch.checked = status;
    }
    
    if (element.status) {
        if (status) {
            element.status.textContent = deviceId === 'emergency-light' ? 'ACTIVE' : 'ON';
            element.status.classList.remove('off');
            element.status.classList.add('on');
        } else {
            element.status.textContent = deviceId === 'emergency-light' ? 'STANDBY' : 'OFF';
            element.status.classList.remove('on');
            element.status.classList.add('off');
        }
    }
}

// Update dashboard metrics
function updateDashboard() {
    if (!roomRef) return;
    
    // Calculate current power usage
    roomRef.child('devices').once('value').then((snapshot) => {
        const devicesData = snapshot.val();
        let totalPower = 0;
        let activeCount = 0;
        
        for (const deviceId in devicesData) {
            if (devicesData[deviceId]?.status && devicePowerData[deviceId]) {
                totalPower += devicePowerData[deviceId].power;
                activeCount++;
            }
        }
        
        // Update power consumption display
        if (powerConsumptionEl) {
            powerConsumptionEl.textContent = `${totalPower}W`;
        }
        
        // Update power meter (max 4000W for visualization)
        if (powerLevelEl) {
            const powerPercentage = Math.min((totalPower / 4000) * 100, 100);
            powerLevelEl.style.width = `${powerPercentage}%`;
        }
        
        // Update power status message
        if (powerStatusEl) {
            if (totalPower === 0) {
                powerStatusEl.textContent = 'All devices are off';
            } else if (totalPower < 1000) {
                powerStatusEl.textContent = 'Low power usage';
            } else if (totalPower < 2500) {
                powerStatusEl.textContent = 'Moderate power usage';
            } else {
                powerStatusEl.textContent = 'High power usage!';
            }
        }
        
        // Update active devices count
        if (activeDevicesEl) {
            activeDevicesEl.textContent = activeCount;
        }
        
        // Update these values in Firebase
        roomRef.child('status').update({
            currentPower: totalPower,
            activeDevices: activeCount,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        });
    });
}

// Update room status UI
function updateRoomStatusUI(statusData) {
    // Update room occupied status
    if (roomStatusEl) {
        if (statusData.occupied) {
            roomStatusEl.textContent = 'Occupied';
            roomStatusEl.style.color = 'var(--success)';
        } else {
            roomStatusEl.textContent = 'Vacant';
            roomStatusEl.style.color = 'var(--danger)';
        }
    }
    
    // Update last activity time
    if (lastActivityEl) {
        if (statusData.lastActivity) {
            const lastActive = new Date(statusData.lastActivity);
            const now = new Date();
            const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));
            
            if (diffMinutes < 1) {
                lastActivityEl.textContent = 'Active now';
            } else if (diffMinutes < 60) {
                lastActivityEl.textContent = `${diffMinutes} min ago`;
            } else {
                const diffHours = Math.floor(diffMinutes / 60);
                lastActivityEl.textContent = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            }
        } else {
            lastActivityEl.textContent = 'No recent activity';
        }
    }
}

// Update time function
function updateTime() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Format time (HH:MM AM/PM)
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    // Format date (Weekday, Day Month Year)
    const weekday = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    
    if (currentTimeEl) currentTimeEl.textContent = `${hours}:${minutes} ${ampm}`;
    if (currentDateEl) currentDateEl.textContent = `${weekday}, ${day} ${month} ${year}`;
    
    // Also update time in Firebase if room is initialized
    if (roomRef) {
        roomRef.child('status').update({
            currentTime: now.toISOString(),
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

// Navigation functions
function goBack() {
    window.history.back();
}

function goToProfile() {
    window.location.href = "profile.html";
}