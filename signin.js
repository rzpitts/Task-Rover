/*
 * Sign‑in page logic for Task Rover
 *
 * Implements a simple passwordless sign‑in flow using just an email field.  When the
 * user submits a valid email address, we mark them as logged in and redirect
 * to the board.  The user’s email is stored in localStorage as `userEmail`.
 * The page also supports dark/light theme toggling consistent with other pages.
 */

(() => {
  // Theme utilities
  const themeToggleBtn = document.getElementById("themeToggle");
  const wrapper = document.getElementById("appWrapper");
  function applyTheme(mode) {
    if (mode === "dark") {
      wrapper.classList.add("dark");
      themeToggleBtn.textContent = "☀️";
      themeToggleBtn.setAttribute("aria-label", "Switch to light mode");
    } else {
      wrapper.classList.remove("dark");
      themeToggleBtn.textContent = "🌙";
      themeToggleBtn.setAttribute("aria-label", "Switch to dark mode");
    }
    localStorage.setItem("taskRoverTheme", mode);
  }
  function initTheme() {
    let theme = localStorage.getItem("taskRoverTheme");
    if (!theme) {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }
    applyTheme(theme);
  }
  function toggleTheme() {
    const isDark = wrapper.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
  }
  themeToggleBtn.addEventListener("click", toggleTheme);
  initTheme();

  // Redirect to board if already logged in
  if (localStorage.getItem("loggedIn")) {
    window.location.href = "board.html";
    return;
  }

  // Sign‑in form handling
  const form = document.getElementById("signinForm");
  const emailInput = document.getElementById("emailInput");
  const messageEl = document.getElementById("signinMessage");
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!validateEmail(email)) {
      messageEl.textContent = "Please enter a valid email address.";
      messageEl.style.color = "#ef4444";
      return;
    }
    // Save login state and email
    try {
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("userEmail", email);
    } catch (_) {
      // ignore
    }
    // Show success message and redirect
    messageEl.textContent = "Check your email for a sign‑in link. Redirecting…";
    messageEl.style.color = "#22c55e";
    setTimeout(() => {
      window.location.href = "board.html";
    }, 1500);
  });
})();