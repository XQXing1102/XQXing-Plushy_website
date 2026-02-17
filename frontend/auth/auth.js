const API =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:9999"
    : "https://your-backend-url.com";

async function handleLogin(event) {
  event.preventDefault();

  const btn = document.querySelector(".liquid-btn");
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("error-message");

  errorMsg.textContent = "";

  if (!username || !password) {
    errorMsg.textContent = "Enter username & password";
    return;
  }

  btn.disabled = true;
  btn.innerHTML = "<span>Signing in...</span>";

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);

      window.location.href = "../index.html";
    } else {
      errorMsg.textContent = data.message || "Invalid credentials";
    }
  } catch (error) {
    console.error(error);
    errorMsg.textContent = "Server not reachable";
  }

  btn.disabled = false;
  btn.innerHTML = "<span>Login</span>";
}

async function handleRegister(event) {
  event.preventDefault();

  const btn = document.querySelector(".liquid-btn");
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document
    .getElementById("confirm-password")
    .value.trim();
  const errorMsg = document.getElementById("error-message");

  errorMsg.textContent = "";

  if (!username || !email || !password) {
    errorMsg.textContent = "Fill all fields";
    return;
  }

  if (password.length < 6) {
    errorMsg.textContent = "Password must be 6+ chars";
    return;
  }

  if (password !== confirmPassword) {
    errorMsg.textContent = "Passwords do not match";
    return;
  }

  btn.disabled = true;
  btn.innerHTML = "<span>Creating account...</span>";

  try {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Registration successful! Login now");
      window.location.href = "login.html";
    } else {
      errorMsg.textContent = data.message || "Registration failed";
    }
  } catch (error) {
    console.error(error);
    errorMsg.textContent = "Server not reachable";
  }

  btn.disabled = false;
  btn.innerHTML = "<span>Register</span>";
}

function getToken() {
  return localStorage.getItem("token");
}

function isLoggedIn() {
  return !!getToken();
}

function getUsername() {
  return localStorage.getItem("username") || "User";
}

function logout() {
  localStorage.clear();

  if (window.location.pathname.includes("/auth/")) {
    window.location.href = "./login.html";
  } else {
    window.location.href = "auth/login.html";
  }
}

function redirectIfNotLoggedIn() {
  if (!isLoggedIn()) {
    window.location.href = "../auth/login.html";
  }
}

function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = "../index.html";
  }
}

function loadUsername() {
  const el = document.getElementById("nav-username");
  if (el) el.textContent = getUsername();
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("login.html")) {
    redirectIfLoggedIn();
  }

  if (window.location.pathname.includes("index.html")) {
    redirectIfNotLoggedIn();
    loadUsername();
  }
});
