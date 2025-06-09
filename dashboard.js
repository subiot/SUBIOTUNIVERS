// Import Firebase modules
import { initializeApp } from 'firebase/app';
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
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
        } else {
            window.location.href = 'index.html';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Profile click handler
    document.querySelector('.profile').addEventListener('click', () => {
        navigate('profile.html');
    });

    // Workshop card click handlers
    Object.values(elements.workshops).forEach(workshop => {
        if (workshop.card) {
            workshop.card.addEventListener('click', () => {
                const workshopId = workshop.card.getAttribute('data-workshop-id') || 
                                 workshop.card.id.replace('ws', '').replace('-', '.');
                updateUserLocation(`Workshop ${workshopId}`);
                navigate(`ws${workshopId.replace('.', '')}.html`);
            });
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
            
            // Set profile image
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
            // Today's power usage
            const todayUsage = data.today || 0;
            elements.stats.powerUsage.value.textContent = `${todayUsage.toFixed(1)} kWh`;
            
            // Change from yesterday
            const change = data.changeFromYesterday || 0;
            elements.stats.powerUsage.subtext.textContent = 
                `${change >= 0 ? '+' : ''}${change}% from yesterday`;
            
            // Monthly consumption
            const monthlyConsumption = data.monthly || 0;
            elements.stats.monthHistory.value.textContent = `${monthlyConsumption} kWh`;
            
            // Monthly cost
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
            // Update each workshop
            updateWorkshop('2.2', data['2.2']);
            updateWorkshop('2.3', data['2.3']);
            updateWorkshop('2.4', data['2.4']);
        }
    });

    // Online users
    const onlineUsersRef = ref(database, 'onlineUsers');
    onValue(onlineUsersRef, (snapshot) => {
        updateOnlineUsersList(snapshot.val());
    });
}

// Update workshop information
function updateWorkshop(workshopId, data) {
    if (!data) return;
    
    const workshopKey = `ws${workshopId.replace('.', '')}`;
    const workshop = elements.workshops[workshopKey];
    
    if (!workshop) return;
    
    // Update basic info
    if (workshop.name) workshop.name.textContent = `Workshop ${workshopId}`;
    if (workshop.desc) workshop.desc.textContent = data.description || `${data.deviceCount || 0} active devices`;
    
    // Update status
    if (workshop.status) {
        workshop.status.textContent = data.status || 'Active';
        workshop.status.style.backgroundColor = 
            data.status === 'Maintenance' ? 'var(--warning)' : 
            data.status === 'Inactive' ? 'var(--gray)' : 'var(--success)';
    }
    
    // Update usage and people
    if (workshop.usage) workshop.usage.textContent = `${(data.powerUsage || 0).toFixed(1)} kWh today`;
    if (workshop.people) workshop.people.textContent = `${data.userCount || 0} people`;
}

// Update online users list
function updateOnlineUsersList(users) {
    if (!elements.onlineUsers.grid) return;
    
    elements.onlineUsers.grid.innerHTML = '';
    
    if (!users) {
        elements.onlineUsers.title.innerHTML = `<i class="fas fa-users"></i> Currently Online (0 Users)`;
        elements.onlineUsers.grid.innerHTML = '<p>No users currently online</p>';
        return;
    }
    
    const userCount = Object.keys(users).length;
    elements.onlineUsers.title.innerHTML = `<i class="fas fa-users"></i> Currently Online (${userCount} Users)`;
    
    Object.entries(users).forEach(([userId, user]) => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.innerHTML = `
            <img src="${user.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'}" 
                 alt="${user.name}" 
                 class="user-avatar">
            <div class="user-info">
                <span class="user-name">${user.name || 'Anonymous'}</span>
                <span class="user-status">
                    <span class="status-indicator"></span>
                    ${user.location || 'Dashboard'}
                </span>
            </div>
        `;
        elements.onlineUsers.grid.appendChild(userCard);
    });
}

// Setup presence system
function setupPresenceSystem() {
    if (!currentUser) return;
    
    const userStatusRef = ref(database, `status/${currentUser.uid}`);
    const userOnlineRef = ref(database, `onlineUsers/${currentUser.uid}`);
    
    // Get user data
    const userRef = ref(database, `users/${currentUser.uid}`);
    onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        
        // Set initial status
        set(userStatusRef, {
            online: true,
            lastChanged: serverTimestamp()
        });
        
        // Set online user data
        set(userOnlineRef, {
            name: userData?.name || currentUser.displayName || 'User',
            avatar: userData?.profileImage || currentUser.photoURL || 'https://randomuser.me/api/portraits/lego/1.jpg',
            location: 'Dashboard',
            lastActive: serverTimestamp(),
            nim: userData?.nim || 'N/A'
        });
        
        // Setup disconnect handlers
        onDisconnect(userStatusRef).set({
            online: false,
            lastChanged: serverTimestamp()
        });
        
        onDisconnect(userOnlineRef).remove();
    }, { onlyOnce: true });
}

// Update user location
function updateUserLocation(location) {
    if (!currentUser) return;
    
    const userOnlineRef = ref(database, `onlineUsers/${currentUser.uid}`);
    update(userOnlineRef, {
        location: location,
        lastActive: serverTimestamp()
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