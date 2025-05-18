// 🔥 Konfigurasi Firebase
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
const dashboardBtn = document.getElementById('dashboard-btn');
const editNameBtn = document.getElementById('edit-name-btn');
const editIdBtn = document.getElementById('edit-id-btn');
const changePhotoBtn = document.getElementById('change-photo-btn');
const photoUpload = document.getElementById('photo-upload');
const profileImage = document.getElementById('profile-image');
const userName = document.getElementById('user-name');
const userId = document.getElementById('user-id');
const userContact = document.getElementById('user-contact');
const powerUsed = document.getElementById('power-used');
const current = document.getElementById('current');
const voltage = document.getElementById('voltage');
const monthlyUsage = document.getElementById('monthly-usage');
const yearlyUsage = document.getElementById('yearly-usage');

// Current user ID
let currentUserId = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
dashboardBtn.addEventListener('click', goToDashboard);
editNameBtn.addEventListener('click', handleEditName);
editIdBtn.addEventListener('click', handleEditId);
changePhotoBtn.addEventListener('click', triggerFileInput);
photoUpload.addEventListener('change', handlePhotoUpload);

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

// Navigation to dashboard
function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// Load user profile data
function loadUserProfile() {
    const userRef = database.ref('users/' + currentUserId);
    
    userRef.on('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            userName.textContent = userData.name || 'Nama Pengguna';
            userId.textContent = userData.nim || '0000000000';
            userContact.textContent = userData.contact || '0882-7192-3081';
            
            if (userData.profileImage) {
                profileImage.src = userData.profileImage;
            }
        }
    });
}

// Setup realtime data listeners
function setupRealtimeData() {
    // Power Usage Data
    const powerRef = database.ref('powerUsage/' + currentUserId);
    
    powerRef.on('value', (snapshot) => {
        const powerData = snapshot.val();
        if (powerData) {
            powerUsed.textContent = (powerData.powerUsed || 0).toFixed(2) + ' KWh';
            current.textContent = (powerData.current || 0).toFixed(2) + ' A';
            voltage.textContent = (powerData.voltage || 0).toFixed(2) + ' V';
        }
    });

    // History Data
    const historyRef = database.ref('usageHistory/' + currentUserId);
    
    historyRef.on('value', (snapshot) => {
        const historyData = snapshot.val();
        if (historyData) {
            monthlyUsage.textContent = (historyData.monthly || 0).toFixed(2) + ' KWh';
            yearlyUsage.textContent = (historyData.yearly || 0).toFixed(2) + ' KWh';
        }
    });
}

// Handle name editing
function handleEditName() {
    const newName = prompt("Masukkan nama baru:", userName.textContent);
    if (newName && newName.trim() !== "") {
        database.ref('users/' + currentUserId).update({
            name: newName.trim()
        });
    }
}

// Handle ID editing
function handleEditId() {
    const newId = prompt("Masukkan NIM baru:", userId.textContent);
    if (newId && newId.trim() !== "") {
        database.ref('users/' + currentUserId).update({
            nim: newId.trim()
        });
    }
}

// Trigger file input
function triggerFileInput() {
    photoUpload.click();
}

// Handle photo upload
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.match('image.*')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            profileImage.src = e.target.result;
            // Save to Firebase
            database.ref('users/' + currentUserId).update({
                profileImage: e.target.result
            });
        };
        
        reader.readAsDataURL(file);
    } else {
        alert("Silakan pilih file gambar yang valid.");
    }
}