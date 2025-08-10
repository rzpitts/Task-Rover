/*
 * Stats page logic for Task Rover
 *
 * Computes simple statistics from the stored tasks and renders them into three
 * sections: by status (To Do / In Progress / Done), by priority (None / High / Medium / Low),
 * and by owner.  The page also provides a back button to return to the board and
 * supports theme toggling.  If the user is not logged in the page redirects
 * to the sign‑in page.
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

  // Redirect to sign‑in if not logged in
  if (!localStorage.getItem("loggedIn")) {
    window.location.href = "signin.html";
    return;
  }
  // Back button
  const backBtn = document.getElementById("backBtn");
  backBtn.addEventListener("click", () => {
    window.location.href = "board.html";
  });
  // Load tasks from localStorage
  let tasks = [];
  try {
    const stored = localStorage.getItem("taskRoverTasks");
    tasks = stored ? JSON.parse(stored) : [];
  } catch (_) {
    tasks = [];
  }
  // Compute statistics
  const statusCounts = {};
  const priorityCounts = {};
  const ownerCounts = {};
  tasks.forEach((task) => {
    // status
    const status = task.status || "unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    // priority
    const pri = task.priority || "none";
    priorityCounts[pri] = (priorityCounts[pri] || 0) + 1;
    // owner
    const owner = task.owner && task.owner.trim() ? task.owner.trim() : "Unassigned";
    ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
  });
  // Helper to render lists
  function renderList(containerId, data, labelMap) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    const keys = Object.keys(data);
    if (keys.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No data";
      container.appendChild(empty);
      return;
    }
    // Sort by count descending
    keys.sort((a, b) => data[b] - data[a]);
    keys.forEach((key) => {
      const item = document.createElement("div");
      item.className = "stats-item";
      const label = labelMap && key in labelMap ? labelMap[key] : key;
      item.textContent = `${label}: ${data[key]}`;
      container.appendChild(item);
    });
  }
  // Render all sections
  renderList("statusList", statusCounts, {
    todo: "To Do",
    doing: "In Progress",
    done: "Done",
  });
  renderList("priorityList", priorityCounts, {
    none: "None",
    high: "High",
    medium: "Medium",
    low: "Low",
  });
  renderList("ownerList", ownerCounts, null);
})();