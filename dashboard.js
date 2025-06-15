// Choose ONE of these import methods - don't use both

// OPTION 1: Modern modular SDK (recommended)
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, onDisconnect, serverTimestamp, update } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBggVwDQP4V-ki7rXADksto5Jzd5tOoO_I",
    authDomain: "subiot-univers.firebaseapp.com",
    databaseURL: "https://subiot-univers-default-rtdb.firebaseio.com",
    projectId: "subiot-univers",
    storageBucket: "subiot-univers.appspot.com",
    messagingSenderId: "116296674465",
    appId: "1:116296674465:web:d62ad44a9dba75240dd4e0"
};

// Initialize Firebase only if it hasn't been initialized already
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const database = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const elements = {
    profile: {
        name: document.querySelector('.profile-name'),
        nim: document.querySelector('.profile-nim'),
        img: document.querySelector('.profile img')
    },
    stats: {
        powerUsage: {
            value: document.querySelector('.power-usage .stat-value'),
            subtext: document.querySelector('.power-usage .stat-subtext')
        },
        monthHistory: {
            value: document.querySelector('.month-history .stat-value'),
            subtext: document.querySelector('.month-history .stat-subtext')
        },
        monthCost: {
            value: document.querySelector('.month-cost .stat-value'),
            subtext: document.querySelector('.month-cost .stat-subtext')
        }
    },
    workshops: {
        ws23: {
            card: document.querySelector('.workshop-card:nth-child(1)'),
            name: document.querySelector('.workshop-card:nth-child(1) .workshop-name'),
            desc: document.querySelector('.workshop-card:nth-child(1) .workshop-desc'),
            status: document.querySelector('.workshop-card:nth-child(1) .workshop-status'),
            usage: document.querySelector('.workshop-card:nth-child(1) .workshop-details .detail-item:nth-child(1) span'),
            people: document.querySelector('.workshop-card:nth-child(1) .workshop-details .detail-item:nth-child(2) span')
        },
        ws22: {
            card: document.querySelector('.workshop-card:nth-child(2)'),
            name: document.querySelector('.workshop-card:nth-child(2) .workshop-name'),
            desc: document.querySelector('.workshop-card:nth-child(2) .workshop-desc'),
            status: document.querySelector('.workshop-card:nth-child(2) .workshop-status'),
            usage: document.querySelector('.workshop-card:nth-child(2) .workshop-details .detail-item:nth-child(1) span'),
            people: document.querySelector('.workshop-card:nth-child(2) .workshop-details .detail-item:nth-child(2) span')
        },
        ws24: {
            card: document.querySelector('.workshop-card:nth-child(3)'),
            name: document.querySelector('.workshop-card:nth-child(3) .workshop-name'),
            desc: document.querySelector('.workshop-card:nth-child(3) .workshop-desc'),
            status: document.querySelector('.workshop-card:nth-child(3) .workshop-status'),
            usage: document.querySelector('.workshop-card:nth-child(3) .workshop-details .detail-item:nth-child(1) span'),
            people: document.querySelector('.workshop-card:nth-child(3) .workshop-details .detail-item:nth-child(2) span')
        }
    },
    onlineUsers: {
        title: document.querySelector('.online-users-title'),
        grid: document.querySelector('.online-users-grid')
    }
};

// Global variables
let currentUser = null;

// Initialize the application
function initApp() {
    // Check auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            setupEventListeners();
            loadUserProfile();
            setupRealtimeData();
            setupPresenceSystem();
            updatePageLocation();
        } else {
            window.location.href = 'index.html';
        }
    });
}

// Function to determine and update current page location
function updatePageLocation() {
    const path = window.location.pathname;
    let location = 'Dashboard';
    
    if (path.includes('ws22.html')) {
        location = 'Workshop 2.2';
    } else if (path.includes('ws23.html')) {
        location = 'Workshop 2.3';
    } else if (path.includes('ws24.html')) {
        location = 'Workshop 2.4';
    } else if (path.includes('history.html')) {
        location = 'History Page';
    } else if (path.includes('profile.html')) {
        location = 'Profile Page';
    }
    
    updateUserLocation(location);
}

// Setup event listeners
function setupEventListeners() {
    // Profile click handler
    document.querySelector('.profile')?.addEventListener('click', () => {
        updateUserLocation('Profile Page');
        setTimeout(() => navigate('profile.html'), 200);
    });

    // Workshop card click handlers
    Object.entries(elements.workshops).forEach(([key, workshop]) => {
        if (workshop.card) {
            const workshopId = key.replace('ws', '').replace('2', '2.');
            workshop.card.setAttribute('data-workshop-id', workshopId);
            
            workshop.card.addEventListener('click', () => {
                const workshopId = workshop.card.getAttribute('data-workshop-id');
                updateUserLocation(`Workshop ${workshopId}`);
                setTimeout(() => navigate(`ws${workshopId.replace('.', '')}.html`), 200);
            });
        }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updatePageLocation();
        }
    });
}

// Load user profile
function loadUserProfile() {
    const userRef = ref(database, `users/${currentUser.uid}`);
    
    onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            elements.profile.name.textContent = userData.name || currentUser.displayName || 'User';
            elements.profile.nim.textContent = `NIM: ${userData.nim || 'N/A'}`;
            
            if (userData.profileImage) {
                elements.profile.img.src = userData.profileImage;
            } else if (currentUser.photoURL) {
                elements.profile.img.src = currentUser.photoURL;
            } else {
                elements.profile.img.src = 'assets/img/default-profile.png';
            }
        }
    }, {
        onlyOnce: true
    });
}

// Setup realtime data listeners
function setupRealtimeData() {
    // Power usage data
    const powerRef = ref(database, 'powerUsage');
    onValue(powerRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const todayUsage = data.today || 0;
            elements.stats.powerUsage.value.textContent = `${todayUsage.toFixed(1)} kWh`;
            
            const change = data.changeFromYesterday || 0;
            elements.stats.powerUsage.subtext.textContent = 
                `${change >= 0 ? '+' : ''}${change}% from yesterday`;
            
            const monthlyConsumption = data.monthly || 0;
            elements.stats.monthHistory.value.textContent = `${monthlyConsumption} kWh`;
            
            const monthlyCost = data.cost || 0;
            elements.stats.monthCost.value.textContent = `Rp ${formatNumber(monthlyCost)}`;
            elements.stats.monthCost.subtext.textContent = 
                `Estimated savings: Rp ${formatNumber(data.estimatedSavings || 0)}`;
        }
    });

    // Workshop data
    const workshopsRef = ref(database, 'workshops');
    onValue(workshopsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateWorkshop('2.2', data['2.2']);
            updateWorkshop('2.3', data['2.3']);
            updateWorkshop('2.4', data['2.4']);
        }
    });

    // Online users - modified to only show online users
    const onlineUsersRef = ref(database, 'onlineUsers');
    onValue(onlineUsersRef, (snapshot) => {
        const users = snapshot.val();
        const onlineUsers = {};
        
        if (users) {
            Object.keys(users).forEach(uid => {
                if (users[uid].isOnline !== false) {
                    onlineUsers[uid] = users[uid];
                }
            });
        }
        
        updateOnlineUsersList(onlineUsers);
    });
}

// Update workshop information
function updateWorkshop(workshopId, data) {
    if (!data) return;
    
    const workshopKey = `ws${workshopId.replace('.', '')}`;
    const workshop = elements.workshops[workshopKey];
    
    if (!workshop) return;
    
    if (workshop.name) workshop.name.textContent = `Workshop ${workshopId}`;
    if (workshop.desc) workshop.desc.textContent = data.description || `${data.deviceCount || 0} active devices`;
    
    if (workshop.status) {
        workshop.status.textContent = data.status || 'Active';
        workshop.status.style.backgroundColor = 
            data.status === 'Maintenance' ? 'var(--warning)' : 
            data.status === 'Inactive' ? 'var(--gray)' : 'var(--success)';
    }
    
    if (workshop.usage) workshop.usage.textContent = `${(data.powerUsage || 0).toFixed(1)} kWh today`;
    if (workshop.people) workshop.people.textContent = `${data.userCount || 0} people`;
}

// Update online users list with location icons
function updateOnlineUsersList(users) {
    if (!elements.onlineUsers.grid) return;
    
    elements.onlineUsers.grid.innerHTML = '';
    
    if (!users || Object.keys(users).length === 0) {
        elements.onlineUsers.title.innerHTML = `<i class="fas fa-users"></i> Currently Online (0 Users)`;
        elements.onlineUsers.grid.innerHTML = '<p>No users currently online</p>';
        return;
    }
    
    const userCount = Object.keys(users).length;
    elements.onlineUsers.title.innerHTML = `<i class="fas fa-users"></i> Currently Online (${userCount} Users)`;
    
    Object.entries(users).forEach(([userId, user]) => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        
        let locationIcon = 'fa-tachometer-alt';
        if (user.location?.includes('Workshop')) {
            locationIcon = 'fa-tools';
        } else if (user.location?.includes('History')) {
            locationIcon = 'fa-history';
        } else if (user.location?.includes('Profile')) {
            locationIcon = 'fa-user';
        }
        
        userCard.innerHTML = `
            <img src="${user.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'}" 
                 alt="${user.name}" 
                 class="user-avatar">
            <div class="user-info">
                <span class="user-name">${user.name || 'Anonymous'}</span>
                <span class="user-nim">${user.nim || 'N/A'}</span>
                <span class="user-status">
                    <span class="status-indicator"></span>
                    <i class="fas ${locationIcon}"></i> ${user.location || 'Dashboard'}
                </span>
            </div>
        `;
        elements.onlineUsers.grid.appendChild(userCard);
    });
}

// Setup presence system with initial location
function setupPresenceSystem() {
    if (!currentUser) return;
    
    const userStatusRef = ref(database, `status/${currentUser.uid}`);
    const userOnlineRef = ref(database, `onlineUsers/${currentUser.uid}`);
    
    const userRef = ref(database, `users/${currentUser.uid}`);
    onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        
        let initialLocation = 'Dashboard';
        const path = window.location.pathname;
        if (path.includes('ws22.html')) initialLocation = 'Workshop 2.2';
        else if (path.includes('ws23.html')) initialLocation = 'Workshop 2.3';
        else if (path.includes('ws24.html')) initialLocation = 'Workshop 2.4';
        else if (path.includes('history.html')) initialLocation = 'History Page';
        else if (path.includes('profile.html')) initialLocation = 'Profile Page';
        
        // Set initial status
        set(userStatusRef, {
            online: true,
            lastChanged: serverTimestamp()
        });
        
        // Set online user data with initial location
        set(userOnlineRef, {
            name: userData?.name || currentUser.displayName || 'User',
            avatar: userData?.profileImage || currentUser.photoURL || 'https://randomuser.me/api/portraits/lego/1.jpg',
            location: initialLocation,
            lastActive: serverTimestamp(),
            nim: userData?.nim || 'N/A',
            isOnline: true  // Explicit online status
        });
        
        // Setup disconnect handlers
        onDisconnect(userStatusRef).set({
            online: false,
            lastChanged: serverTimestamp()
        });
        
        onDisconnect(userOnlineRef).update({
            isOnline: false,  // Mark as offline instead of removing
            lastActive: serverTimestamp()
        });
    }, { onlyOnce: true });
}

// Update user location
function updateUserLocation(location) {
    if (!currentUser) return;
    
    const userOnlineRef = ref(database, `onlineUsers/${currentUser.uid}`);
    const userStatusRef = ref(database, `status/${currentUser.uid}`);
    
    // Update both location and status
    const updates = {
        location: location,
        lastActive: serverTimestamp(),
        isOnline: true
    };
    
    update(userOnlineRef, updates);
    
    // Also update the status to ensure they stay marked as online
    update(userStatusRef, {
        online: true,
        lastChanged: serverTimestamp()
    });
}

// Helper function to format numbers
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Navigation function
function navigate(page) {
    window.location.href = page;
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);