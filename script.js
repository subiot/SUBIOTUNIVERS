// 🔥 Import Firebase dari CDN
import { auth, database } from "./konfigurasi.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", function () {
    let registerButton = document.querySelector(".btn");

    if (!registerButton) {
        console.error("Tombol register tidak ditemukan!");
        return;
    }

    registerButton.addEventListener("click", function (event) {
        event.preventDefault();

        let nameInput = document.getElementById("nameInput");
        let nimInput = document.getElementById("nimInput");
        let waInput = document.getElementById("waInput");
        let emailInput = document.getElementById("emailInput");
        let passwordInput = document.getElementById("passwordInput");

        if (!nameInput || !nimInput || !waInput || !emailInput || !passwordInput) {
            console.error("Salah satu input tidak ditemukan!");
            alert("Harap isi semua kolom!");
            return;
        }

        let name = nameInput.value.trim();
        let nim = nimInput.value.trim();
        let wa = waInput.value.trim();
        let email = emailInput.value.trim();
        let password = passwordInput.value.trim();

        if (name === "" || nim === "" || wa === "" || email === "" || password === "") {
            alert("Harap isi semua kolom!");
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                let user = userCredential.user;

                // 🔥 Simpan data pengguna di Firebase Database
                set(ref(database, "users/" + user.uid), {
                    name: name,
                    nim: nim,
                    wa: wa,
                    email: email
                });

                alert("Pendaftaran berhasil! Silakan login.");
                window.location.href = "index.html";
            })
            .catch((error) => {
                if (error.code === "auth/email-already-in-use") {
                    alert("Email sudah terdaftar! Silakan gunakan email lain atau login.");
                } else {
                    alert("Error: " + error.message);
                }
            });
    });
});

   