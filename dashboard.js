// dashboard.js - Workshop Monitoring with Firebase Integration
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
// Firebase Configuration (same as in profil.js)
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
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const profileName = document.querySelector('.profile-name');
const profileNim = document.querySelector('.profile-nim');
const profileImg = document.querySelector('.profile img');
const powerUsageValue = document.querySelector('.power-usage .stat-value');
const monthConsumptionValue = document.querySelector('.month-history .stat-value');
const monthCostValue = document.querySelector('.month-cost .stat-value');

// Workshop elements
const workshop23Usage = document.querySelector('.workshop-card:nth-child(1) .detail-item:nth-child(1) span');
const workshop23People = document.querySelector('.workshop-card:nth-child(1) .detail-item:nth-child(2) span');
const workshop22Usage = document.querySelector('.workshop-card:nth-child(2) .detail-item:nth-child(1) span');
const workshop22People = document.querySelector('.workshop-card:nth-child(2) .detail-item:nth-child(2) span');
const workshop24Usage = document.querySelector('.workshop-card:nth-child(3) .detail-item:nth-child(1) span');
const workshop24People = document.querySelector('.workshop-card:nth-child(3) .detail-item:nth-child(2) span');

// Current user ID
let currentUserId = null;

// Initialize the application
function initApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            loadUserProfile();
            setupRealtimeData();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });
}

// Load user profile from Firebase
function loadUserProfile() {
    const userRef = database.ref('users/' + currentUserId);
    
    userRef.on('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            profileName.textContent = userData.name || 'Nama Pengguna';
            profileNim.textContent = `NIM: ${userData.nim || '0000000000'}`;
            
            if (userData.profileImage) {
                profileImg.src = userData.profileImage;
            } else {
                profileImg.src = 'assets/img/ibnu_formal-removebg-preview 1.png';
            }
        }
    });
}

// Setup realtime data listeners for energy monitoring
function setupRealtimeData() {
    // Power Usage Data
    const powerRef = database.ref('powerUsage/' + currentUserId);
    
    powerRef.on('value', (snapshot) => {
        const powerData = snapshot.val();
        if (powerData) {
            // Update dashboard stats
            powerUsageValue.textContent = `${(powerData.powerUsed || 0).toFixed(1)} kWh`;
            
            // Calculate monthly consumption (assuming 30 days)
            const monthly = (powerData.powerUsed || 0) * 30;
            monthConsumptionValue.textContent = `${monthly.toFixed(0)} kWh`;
            
            // Calculate monthly cost (Rp 1,500 per kWh)
            const cost = monthly * 1500;
            monthCostValue.textContent = `Rp ${formatNumber(cost.toFixed(0))}`;
        }
    });

    // Workshop Data
    const workshopRef = database.ref('workshops/' + currentUserId);
    
    workshopRef.on('value', (snapshot) => {
        const workshopData = snapshot.val();
        if (workshopData) {
            // Update workshop 2.3
            if (workshopData.ws23) {
                workshop23Usage.textContent = `${(workshopData.ws23.usage || 0).toFixed(1)} kWh today`;
                workshop23People.textContent = `${workshopData.ws23.people || 0} people`;
            }
            
            // Update workshop 2.2
            if (workshopData.ws22) {
                workshop22Usage.textContent = `${(workshopData.ws22.usage || 0).toFixed(1)} kWh today`;
                workshop22People.textContent = `${workshopData.ws22.people || 0} people`;
                
                // Update status based on maintenance flag
                const statusElement = document.querySelector('.workshop-card:nth-child(2) .workshop-status');
                if (workshopData.ws22.maintenance) {
                    statusElement.textContent = 'Maintenance';
                    statusElement.style.backgroundColor = 'var(--warning)';
                } else {
                    statusElement.textContent = 'Active';
                    statusElement.style.backgroundColor = 'var(--success)';
                }
            }
            
            // Update workshop 2.4
            if (workshopData.ws24) {
                workshop24Usage.textContent = `${(workshopData.ws24.usage || 0).toFixed(1)} kWh today`;
                workshop24People.textContent = `${workshopData.ws24.people || 0} people`;
            }
        }
    });

    // History Data (for more detailed analytics if needed)
    const historyRef = database.ref('usageHistory/' + currentUserId);
    historyRef.on('value', (snapshot) => {
        const historyData = snapshot.val();
        // Could use this for more detailed reporting
    });
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Navigation function
function navigate(page) {
    window.location.href = page;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);