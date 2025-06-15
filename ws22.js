// ws22.js - Smart Device Control System for Workshop 2.2 with Firebase
// With exclusive control feature by one user at a time

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBggVwDQP4V-ki7rXADksto5Jzd5tOoO_I",
    authDomain: "subiot-univers.firebaseapp.com",
    databaseURL: "https://subiot-univers-default-rtdb.firebaseio.com",
    projectId: "subiot-univers",
    storageBucket: "subiot-univers.appspot.com",
    messagingSenderId: "116296674465",
    appId: "1:116296674465:web:d62ad44a9dba75240dd4e0",
    measurementId: "G-XSX0C22H90"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Utility function for safe DOM manipulation
const dom = {
    get: (id) => {
        const el = document.getElementById(id);
        if (!el) console.warn(`Element with ID '${id}' not found`);
        return el;
    },
    setText: (el, text) => {
        if (el && el.textContent !== undefined) el.textContent = text;
    },
    setHtml: (el, html) => {
        if (el && el.innerHTML !== undefined) el.innerHTML = html;
    },
    setStyle: (el, property, value) => {
        if (el && el.style) el.style[property] = value;
    },
    addClass: (el, className) => {
        if (el && el.classList) el.classList.add(className);
    },
    removeClass: (el, className) => {
        if (el && el.classList) el.classList.remove(className);
    },
    toggleClass: (el, className, condition) => {
        if (el && el.classList) {
            condition ? el.classList.add(className) : el.classList.remove(className);
        }
    }
};

// DOM elements with null checks
const elements = {
    // Dashboard elements
    powerConsumption: dom.get('power-consumption'),
    powerLevel: dom.get('power-level'),
    powerStatus: dom.get('power-status'),
    activeDevices: dom.get('active-devices'),
    deviceStatus: dom.get('device-status'),
    currentUserDisplay: dom.get('current-user-display'),
    currentUserName: dom.get('current-user-name'),
    currentTime: dom.get('current-time'),
    currentDate: dom.get('current-date'),
    controllerDisplay: dom.get('current-controller'),
    
    // Device toggles
    device1Toggle: dom.get('device1-toggle'),
    device2Toggle: dom.get('device2-toggle'),
    device3Toggle: dom.get('device3-toggle'),
    device1Status: dom.get('device1-status'),
    device2Status: dom.get('device2-status'),
    device3Status: dom.get('device3-status'),
    
    // Device control page
    deviceControlPage: dom.get('device-control-page'),
    controlIcon: dom.get('control-icon'),
    controlDeviceName: dom.get('control-device-name'),
    controlDeviceStatus: dom.get('control-device-status'),
    statPower: dom.get('stat-power'),
    statVoltage: dom.get('stat-voltage'),
    statCurrent: dom.get('stat-current'),
    statEnergy: dom.get('stat-energy'),
    toggleOffBtn: dom.get('toggle-off-btn'),
    toggleOnBtn: dom.get('toggle-on-btn'),
    controllerNameDisplay: dom.get('controller-name')
};

// Device data and state
let currentUser = null;
let currentController = null;
let selectedDevice = null;
let energyIntervals = {};
const deviceColors = {
    'device1': '#FFC107',
    'device2': '#4CAF50',
    'device3': '#2196F3'
};

// Initialize the application
function initApp() {
    // Check authentication state
    auth.onAuthStateChanged(user => {
        if (user) {
            // Get user profile data from database
            database.ref(`users/${user.uid}`).once('value').then(snapshot => {
                const userData = snapshot.val();
                currentUser = {
                    uid: user.uid,
                    name: userData?.name || user.email.split('@')[0],
                    nim: userData?.nim || 'N/A'
                };
                
                updateUserDisplay(currentUser.name);
                loadInitialDeviceStates();
                
                // Set up listener for controller changes
                setupControllerListener();
                
                // Update user online status
                updateUserOnlineStatus(true);
            }).catch(error => {
                console.error('Error fetching user data:', error);
            });
        } else {
            // Redirect to login page if not authenticated
            window.location.href = 'login.html';
        }
    });
    
    // Set up real-time clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Initialize UI elements
    updateToggleButtons(false, false);
    
    // Handle page visibility changes to update online status
    document.addEventListener('visibilitychange', () => {
        if (currentUser) {
            updateUserOnlineStatus(!document.hidden);
        }
    });
}

// Update user online status in Firebase
function updateUserOnlineStatus(isOnline) {
    if (!currentUser) return;
    
    const userStatusRef = database.ref(`status/${currentUser.uid}`);
    const statusUpdate = {
        online: isOnline,
        lastChanged: firebase.database.ServerValue.TIMESTAMP,
        name: currentUser.name,
        nim: currentUser.nim
    };
    
    if (isOnline) {
        // Set online status and setup disconnect handler
        userStatusRef.set(statusUpdate)
            .then(() => {
                userStatusRef.onDisconnect().update({
                    online: false,
                    lastChanged: firebase.database.ServerValue.TIMESTAMP
                });
            })
            .catch(error => {
                console.error('Error setting online status:', error);
            });
    } else {
        userStatusRef.update(statusUpdate)
            .catch(error => {
                console.error('Error updating online status:', error);
            });
    }
}

// Set up listener for controller changes
function setupControllerListener() {
    database.ref('workshop22/currentController').on('value', snapshot => {
        currentController = snapshot.val();
        
        // Update controller display
        if (currentController) {
            // Get controller user details
            database.ref(`users/${currentController}`).once('value').then(userSnapshot => {
                const userData = userSnapshot.val();
                const controllerName = userData?.name || 'Unknown User';
                const controllerNIM = userData?.nim ? ` (${userData.nim})` : '';
                
                dom.setText(elements.controllerDisplay, `Controller: ${controllerName}${controllerNIM}`);
                dom.setText(elements.controllerNameDisplay, `${controllerName}${controllerNIM}`);
            }).catch(error => {
                console.error('Error fetching controller data:', error);
            });
        } else {
            dom.setText(elements.controllerDisplay, 'No active controller');
            dom.setText(elements.controllerNameDisplay, 'None');
        }
        
        // Disable controls if another user is controlling
        const disableControls = currentController && currentController !== currentUser?.uid;
        
        if (elements.device1Toggle) elements.device1Toggle.disabled = disableControls;
        if (elements.device2Toggle) elements.device2Toggle.disabled = disableControls;
        if (elements.device3Toggle) elements.device3Toggle.disabled = disableControls;
        
        // Update control page buttons if open
        if (selectedDevice) {
            updateToggleButtons(
                elements.toggleOffBtn && elements.toggleOffBtn.style.display === 'flex',
                !disableControls
            );
        }
        
        // Add visual indicator
        document.querySelectorAll('.device-card').forEach(card => {
            if (card) {
                disableControls ? dom.addClass(card, 'disabled-control') : dom.removeClass(card, 'disabled-control');
            }
        });
    }, error => {
        console.error('Controller listener error:', error);
    });
}

// Load initial device states from Firebase
function loadInitialDeviceStates() {
    database.ref('workshop22/devices').on('value', snapshot => {
        if (snapshot.exists()) {
            const deviceData = snapshot.val();
            updateDeviceUI(deviceData);
            updateDashboard(deviceData);
            
            // If we have a selected device, update its control page
            if (selectedDevice && deviceData[selectedDevice]) {
                updateDeviceControlPage(selectedDevice, deviceData[selectedDevice]);
            }
        }
    }, error => {
        console.error('Device states listener error:', error);
    });
}

// Update device UI based on Firebase data
function updateDeviceUI(deviceData) {
    for (const deviceId in deviceData) {
        const device = deviceData[deviceId];
        const toggleElement = elements[`${deviceId}Toggle`];
        const statusElement = elements[`${deviceId}Status`];
        
        if (toggleElement) {
            toggleElement.checked = device.on;
        }
        
        if (statusElement) {
            dom.setText(statusElement, device.on ? 'ON' : 'OFF');
            dom.toggleClass(statusElement, 'on', device.on);
            dom.toggleClass(statusElement, 'off', !device.on);
        }
    }
}

// Update dashboard metrics
function updateDashboard(deviceData) {
    let totalPower = 0;
    let activeCount = 0;
    let inUseCount = 0;
    
    // Calculate totals
    for (const deviceId in deviceData) {
        if (deviceData[deviceId].on) {
            totalPower += deviceData[deviceId].power || 0;
            activeCount++;
            if (deviceData[deviceId].user) {
                inUseCount++;
            }
        }
    }
    
    // Update power consumption
    dom.setText(elements.powerConsumption, `${totalPower.toFixed(2)}W`);
    
    // Update power meter (max 3000W for visualization)
    const powerPercentage = Math.min((totalPower / 3000) * 100, 100);
    dom.setStyle(elements.powerLevel, 'width', `${powerPercentage}%`);
    
    // Update active devices
    dom.setText(elements.activeDevices, activeCount.toString());
    
    // Update power status message
    let powerStatusMessage = '';
    if (totalPower === 0) {
        powerStatusMessage = 'All devices are off';
    } else if (totalPower < 1000) {
        powerStatusMessage = 'Low power usage';
    } else if (totalPower < 2000) {
        powerStatusMessage = 'Moderate power usage';
    } else {
        powerStatusMessage = 'High power usage!';
    }
    dom.setText(elements.powerStatus, powerStatusMessage);
    
    // Update device status
    let deviceStatusMessage = '';
    if (inUseCount === 3) {
        deviceStatusMessage = 'Fully Occupied';
    } else if (inUseCount > 0) {
        deviceStatusMessage = 'Partially Available';
    } else {
        deviceStatusMessage = 'Available';
    }
    dom.setText(elements.deviceStatus, deviceStatusMessage);
}

// Update clock display
function updateClock() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    
    dom.setText(elements.currentTime, now.toLocaleTimeString([], timeOptions));
    dom.setText(elements.currentDate, now.toLocaleDateString([], dateOptions));
}

// Toggle device state
function toggleDeviceState(event, deviceId) {
    if (!event) return;
    event.stopPropagation(); // Prevent triggering the card click
    
    if (!currentUser) {
        alert('Please login to control devices');
        return;
    }
    
    // Check if another user is currently controlling
    if (currentController && currentController !== currentUser.uid) {
        alert('Another user is currently controlling the devices. Please wait.');
        if (event.target) event.target.checked = !event.target.checked; // Revert toggle state
        return;
    }
    
    const isChecked = event.target?.checked;
    const updates = {};
    
    if (isChecked) {
        // Set this user as current controller
        updates['workshop22/currentController'] = currentUser.uid;
        
        // Turn on the device
        updates[`workshop22/devices/${deviceId}/on`] = true;
        updates[`workshop22/devices/${deviceId}/user`] = {
            id: currentUser.uid,
            name: currentUser.name,
            nim: currentUser.nim,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        // Set random power consumption between 100W and 1000W
        updates[`workshop22/devices/${deviceId}/power`] = Math.floor(Math.random() * 900) + 100;
        // Standard voltage with slight variation
        updates[`workshop22/devices/${deviceId}/voltage`] = 220 + (Math.random() * 10 - 5);
    } else {
        // Turn off the device
        updates[`workshop22/devices/${deviceId}/on`] = false;
        updates[`workshop22/devices/${deviceId}/user`] = null;
        updates[`workshop22/devices/${deviceId}/power`] = 0;
        updates[`workshop22/devices/${deviceId}/voltage`] = 0;
        updates[`workshop22/devices/${deviceId}/current`] = 0;
        
        // If all devices are off, release control
        checkAndReleaseControl(updates);
        return;
    }
    
    database.ref().update(updates).catch(error => {
        console.error('Error updating device state:', error);
        // Revert the toggle if update fails
        if (event.target) event.target.checked = !isChecked;
    });
}

// Check if all devices are off and release control if true
function checkAndReleaseControl(updates) {
    database.ref('workshop22/devices').once('value').then(devicesSnapshot => {
        let anyDeviceOn = false;
        devicesSnapshot.forEach(device => {
            if (device.val().on) anyDeviceOn = true;
        });
        
        if (!anyDeviceOn) {
            updates['workshop22/currentController'] = null;
        }
        
        database.ref().update(updates).catch(error => {
            console.error('Error updating device state:', error);
        });
    }).catch(error => {
        console.error('Error checking device states:', error);
    });
}

// Show device control page
function showDeviceControl(deviceId) {
    if (!deviceId) return;
    
    selectedDevice = deviceId;
    
    // Get current device data from Firebase
    database.ref(`workshop22/devices/${deviceId}`).once('value').then(snapshot => {
        if (snapshot.exists()) {
            const deviceData = snapshot.val();
            updateDeviceControlPage(deviceId, deviceData);
            
            // Show the control page
            if (elements.deviceControlPage) {
                elements.deviceControlPage.style.display = 'block';
                elements.deviceControlPage.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }).catch(error => {
        console.error('Error fetching device data:', error);
    });
}

// Update device control page UI
function updateDeviceControlPage(deviceId, deviceData) {
    if (!deviceId || !deviceData) return;
    
    // Update basic info
    const deviceName = deviceId.charAt(0).toUpperCase() + deviceId.slice(1);
    dom.setText(elements.controlDeviceName, deviceName);
    dom.setText(elements.controlDeviceStatus, `Status: ${deviceData.on ? 'ON' : 'OFF'}`);
    if (elements.controlIcon) {
        elements.controlIcon.style.backgroundColor = deviceColors[deviceId] || '#cccccc';
    }
    
    // Calculate current if not already set
    const current = deviceData.on ? (deviceData.power / (deviceData.voltage || 220)) : 0;
    
    // Update stats
    dom.setText(elements.statPower, `${(deviceData.power || 0).toFixed(2)} W`);
    dom.setText(elements.statVoltage, `${(deviceData.voltage || 0).toFixed(2)} V`);
    dom.setText(elements.statCurrent, `${current.toFixed(2)} A`);
    
    // Update energy (calculate based on time if device is on)
    if (deviceData.on) {
        startEnergyCalculation(deviceId, deviceData);
    } else {
        stopEnergyCalculation(deviceId);
        dom.setText(elements.statEnergy, '0.0000 kWh');
    }
    
    // Update toggle buttons state
    const isController = !currentController || currentController === currentUser?.uid;
    updateToggleButtons(deviceData.on, isController);
    
    // Show current user if device is in use
    if (elements.currentUserDisplay && elements.currentUserName) {
        if (deviceData.on && deviceData.user) {
            elements.currentUserDisplay.style.display = 'flex';
            const userNIM = deviceData.user.nim ? ` (${deviceData.user.nim})` : '';
            dom.setText(elements.currentUserName, `${deviceData.user.name || "Unknown User"}${userNIM}`);
        } else {
            elements.currentUserDisplay.style.display = 'none';
        }
    }
}

// Update toggle buttons state
function updateToggleButtons(isOn, isController) {
    if (!elements.toggleOffBtn || !elements.toggleOnBtn) return;
    
    elements.toggleOffBtn.style.display = isOn ? 'flex' : 'none';
    elements.toggleOnBtn.style.display = isOn ? 'none' : 'flex';
    
    // Disable buttons if not controller
    elements.toggleOffBtn.disabled = !isController;
    elements.toggleOnBtn.disabled = !isController;
    
    // Add tooltip if disabled
    if (!isController) {
        elements.toggleOffBtn.title = "Control locked by another user";
        elements.toggleOnBtn.title = "Control locked by another user";
    } else {
        elements.toggleOffBtn.title = "";
        elements.toggleOnBtn.title = "";
    }
}

// Start energy calculation for a device
function startEnergyCalculation(deviceId, deviceData) {
    if (!deviceId || !deviceData) return;
    
    // Stop any existing interval for this device
    stopEnergyCalculation(deviceId);
    
    // Get the timestamp when the device was turned on
    const startTime = deviceData.user?.timestamp ? new Date(deviceData.user.timestamp) : new Date();
    
    // Calculate energy in kWh (energy = power * time / 1000)
    const updateEnergy = () => {
        const hours = (new Date() - startTime) / (1000 * 60 * 60);
        const energy = ((deviceData.power || 0) * hours) / 1000;
        
        // Update Firebase and UI
        database.ref(`workshop22/devices/${deviceId}/energy`).set(energy)
            .catch(error => {
                console.error('Error updating energy:', error);
            });
        dom.setText(elements.statEnergy, `${energy.toFixed(4)} kWh`);
    };
    
    // Update immediately and set interval
    updateEnergy();
    energyIntervals[deviceId] = setInterval(updateEnergy, 1000);
}

// Stop energy calculation for a device
function stopEnergyCalculation(deviceId) {
    if (!deviceId) return;
    
    if (energyIntervals[deviceId]) {
        clearInterval(energyIntervals[deviceId]);
        delete energyIntervals[deviceId];
    }
}

// Toggle device from control page
function toggleDevice(turnOn) {
    if (!selectedDevice || !currentUser) return;
    
    // Check if another user is currently controlling
    if (currentController && currentController !== currentUser.uid) {
        alert('Another user is currently controlling the devices. Please wait.');
        return;
    }
    
    const updates = {};
    
    if (turnOn) {
        // Set this user as current controller
        updates['workshop22/currentController'] = currentUser.uid;
        
        // Turn on the device
        updates[`workshop22/devices/${selectedDevice}/on`] = true;
        updates[`workshop22/devices/${selectedDevice}/user`] = {
            id: currentUser.uid,
            name: currentUser.name,
            nim: currentUser.nim,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        // Set random power consumption between 100W and 1000W
        updates[`workshop22/devices/${selectedDevice}/power`] = Math.floor(Math.random() * 900) + 100;
        // Standard voltage with slight variation
        updates[`workshop22/devices/${selectedDevice}/voltage`] = 220 + (Math.random() * 10 - 5);
    } else {
        // Turn off the device
        updates[`workshop22/devices/${selectedDevice}/on`] = false;
        updates[`workshop22/devices/${selectedDevice}/user`] = null;
        updates[`workshop22/devices/${selectedDevice}/power`] = 0;
        updates[`workshop22/devices/${selectedDevice}/voltage`] = 0;
        updates[`workshop22/devices/${selectedDevice}/current`] = 0;
        updates[`workshop22/devices/${selectedDevice}/energy`] = 0;
        
        // If all devices are off, release control
        checkAndReleaseControl(updates);
        return;
    }
    
    database.ref().update(updates).catch(error => {
        console.error('Error updating device state:', error);
    });
}

// Update user display
function updateUserDisplay(userName) {
    if (elements.currentUserDisplay) {
        dom.setText(elements.currentUserDisplay, userName);
    }
    if (elements.currentUser) {
        dom.setText(elements.currentUser, userName);
    }
}

// Navigation functions
function goBack() {
    if (elements.deviceControlPage) {
        elements.deviceControlPage.style.display = 'none';
    }
}

function goToProfile() {
    window.location.href = 'profil.html';
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// Initialize event listeners
function setupEventListeners() {
    // Device toggles
    if (elements.device1Toggle) {
        elements.device1Toggle.addEventListener('change', (e) => toggleDeviceState(e, 'device1'));
    }
    if (elements.device2Toggle) {
        elements.device2Toggle.addEventListener('change', (e) => toggleDeviceState(e, 'device2'));
    }
    if (elements.device3Toggle) {
        elements.device3Toggle.addEventListener('change', (e) => toggleDeviceState(e, 'device3'));
    }
    
    // Device cards
    const deviceCards = document.querySelectorAll('.device-card');
    if (deviceCards) {
        deviceCards.forEach(card => {
            if (card) {
                const deviceId = card.getAttribute('data-device');
                card.addEventListener('click', () => showDeviceControl(deviceId));
            }
        });
    }
    
    // Control buttons
    if (elements.toggleOnBtn) {
        elements.toggleOnBtn.addEventListener('click', () => toggleDevice(true));
    }
    if (elements.toggleOffBtn) {
        elements.toggleOffBtn.addEventListener('click', () => toggleDevice(false));
    }
    
    // Navigation buttons
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }
    
    const profileBtn = document.querySelector('.profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', goToProfile);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});