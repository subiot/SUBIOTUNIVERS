import { auth } from "./konfigurasi.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
    if (document.title === "Login Page") {
        let emailInput = document.getElementById("emailLogin");
        let passwordInput = document.getElementById("passwordLogin");
        let loginButton = document.getElementById("login-btn");

        if (!emailInput || !passwordInput || !loginButton) {
            console.error("Salah satu input tidak ditemukan! Periksa ID di HTML.");
            return;
        }

        loginButton.addEventListener("click", async function () {
            let email = emailInput.value.trim();
            let password = passwordInput.value.trim();

            if (email === "" || password === "") {
                alert("Harap isi email dan password!");
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, password);
                alert("Login berhasil!");
                window.location.replace("dashboard.html"); // Redirect ke dashboard
            } catch (error) {
                alert("Login gagal: " + error.message);
            }
        });
    }
});
