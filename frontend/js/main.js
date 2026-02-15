/* ================================
   XQXing-Plushy Global JS
   Used across all tools
================================ */

function toggleTheme() {
  const body = document.body;

  if (body.classList.contains("light")) {
    body.classList.remove("light");
    localStorage.setItem("theme", "dark");
  } else {
    body.classList.add("light");
    localStorage.setItem("theme", "light");
  }
}

(function () {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light");
  }
})();

function showNotification(title, msg) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: msg,
      icon: "https://cdn-icons-png.flaticon.com/512/1827/1827392.png",
    });
  }
}

if ("Notification" in window) {
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

function searchTools() {
  const input = document.getElementById("toolSearch");
  if (!input) return;

  const filter = input.value.toLowerCase();
  const cards = document.querySelectorAll(".tool-card");

  cards.forEach((card) => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(filter) ? "block" : "none";
  });
}

console.log(
  "%cXQXing-Plushy Tools Loaded 🚀",
  "color:#38bdf8;font-size:16px;font-weight:bold;",
);
