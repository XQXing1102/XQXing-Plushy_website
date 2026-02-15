const API = "http://127.0.0.1:5000";

// Handle Login Form Submission
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("error-message");

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      window.location.href = "../index.html";
    } else {
      errorMsg.textContent = data.message || "Login failed";
    }
  } catch (error) {
    errorMsg.textContent = "Error connecting to server";
    console.error("Login error:", error);
  }
}

// Handle Register Form Submission
async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const errorMsg = document.getElementById("error-message");

  // Validate password match
  if (password !== confirmPassword) {
    errorMsg.textContent = "Passwords do not match";
    return;
  }

  try {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Registration successful! Please login.");
      window.location.href = "login.html";
    } else {
      errorMsg.textContent = data.message || "Registration failed";
    }
  } catch (error) {
    errorMsg.textContent = "Error connecting to server";
    console.error("Register error:", error);
  }
}

// Get token from localStorage
function getToken() {
  return localStorage.getItem("token");
}

// Check if user is logged in
function isLoggedIn() {
  return getToken() !== null;
}

// Get username from localStorage
function getUsername() {
  return localStorage.getItem("username");
}

// Logout user
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  // Check current path and redirect accordingly
  if (window.location.pathname.includes("/auth/")) {
    window.location.href = "./login.html";
  } else {
    window.location.href = "auth/login.html";
  }
}

// Redirect to login if not authenticated
function redirectIfNotLoggedIn() {
  if (!isLoggedIn()) {
    window.location.href = "../auth/login.html";
  }
}
