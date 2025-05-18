import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 🔥 Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// 🔥 Ekspor modul
export { app, auth, database };
