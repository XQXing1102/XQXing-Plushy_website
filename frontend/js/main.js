const isTouch = "ontouchstart" in window;
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle("light");
  localStorage.setItem("theme", isLight ? "light" : "dark");
}

(function () {
  const saved = localStorage.getItem("theme") || "dark";
  if (saved === "light")
    document.documentElement.classList.add("light-preload");
  document.addEventListener("DOMContentLoaded", () => applyTheme(saved));
})();

function showNotification(title, msg) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, {
      body: msg,
      icon: "https://cdn-icons-png.flaticon.com/512/1827/1827392.png",
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") showNotification(title, msg);
    });
  }
}

(function () {
  if (prefersReducedMotion) return;

  let targetX = 0,
    targetY = 0;
  let currentX = 0,
    currentY = 0;
  let blobs = [];

  function onPointerMove(e) {
    targetX = (e.clientX / window.innerWidth - 0.5) * 20;
    targetY = (e.clientY / window.innerHeight - 0.5) * 20;
  }

  function animate() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    document.documentElement.style.setProperty("--tx", currentX + "px");
    document.documentElement.style.setProperty("--ty", currentY + "px");

    blobs.forEach((b, i) => {
      const ix = (currentX * (i + 1)) / 12;
      const iy = (currentY * (i + 1)) / 12;
      b.style.transform = `translate3d(${ix}px,${iy}px,0)`;
    });

    requestAnimationFrame(animate);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("ui-ready");

    document
      .querySelectorAll(".auth-card, .tool-tile, .glass-header, .card")
      .forEach((el, i) => {
        setTimeout(() => el.classList.add("visible"), i * 80);
      });

    if (!document.querySelector(".blob")) {
      const a = document.createElement("div");
      a.className = "blob";
      a.style.cssText = `
        position:fixed;left:-10%;top:-10%;
        width:50vw;height:30vh;
        background:radial-gradient(circle, rgba(124,58,237,.15), transparent 60%);
        filter:blur(40px);
        z-index:-1;pointer-events:none;
      `;
      document.body.appendChild(a);

      const b = document.createElement("div");
      b.className = "blob";
      b.style.cssText = `
        position:fixed;right:-10%;bottom:-10%;
        width:40vw;height:25vh;
        background:radial-gradient(circle, rgba(59,130,246,.15), transparent 60%);
        filter:blur(40px);
        z-index:-1;pointer-events:none;
      `;
      document.body.appendChild(b);
    }

    blobs = document.querySelectorAll(".blob");

    if (!isTouch) {
      document.addEventListener("pointermove", onPointerMove);
      requestAnimationFrame(animate);
    }
  });
})();

function searchTools() {
  const input = document.getElementById("toolSearch");
  if (!input) return;

  const filter = input.value.toLowerCase();
  const cards = document.querySelectorAll(".tool-tile");

  cards.forEach((card) => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(filter) ? "" : "none";
  });
}

window.addEventListener("error", (e) => {
  console.error("Global JS Error:", e.message);
});

console.log(
  "%c🚀 XQXing-Plushy Tools Loaded",
  "color:#22c55e;font-size:14px;font-weight:bold;",
);
