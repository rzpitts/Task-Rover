/*
 * Board page logic for Task Rover
 *
 * This script powers the main kanban board. It handles authentication
 * checking, task management (create/edit/delete/move), rendering the
 * columns, and navigation to other pages (stats, sign out). Tasks are
 * stored in localStorage under the key `taskRoverTasks`.
 */

(() => {
  // Define statuses and their display labels
  const statuses = [
    { key: "todo", label: "To Do" },
    { key: "doing", label: "In Progress" },
    { key: "done", label: "Done" },
  ];

  let tasks = [];
  let currentEditId = null;
  let undoTimer = null;

  // Elements
  const boardEl = document.getElementById("board");
  const quickAddInput = document.getElementById("quickAddInput");
  const quickAddBtn = document.getElementById("quickAddBtn");
  const themeToggleBtn = document.getElementById("themeToggle");
  const toastEl = document.getElementById("toast");
  const overlayEl = document.getElementById("overlay");
  const taskModalEl = document.getElementById("taskModal");
  const taskForm = document.getElementById("taskForm");
  const modalTitleEl = document.getElementById("modalTitle");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDueInput = document.getElementById("taskDueInput");
  const taskOwnerInput = document.getElementById("taskOwnerInput");
  const deleteTaskBtn = document.getElementById("deleteTaskBtn");
  const cancelTaskBtn = document.getElementById("cancelTaskBtn");
  const priorityOptions = document.getElementById("priorityOptions");
  const statusOptions = document.getElementById("statusOptions");
  const saveTaskBtn = document.getElementById("saveTaskBtn");

  /**
   * Initialise the board page
   */
  function init() {
    // Redirect to sign-in if not logged in
    const loggedIn = localStorage.getItem("loggedIn");
    if (!loggedIn) {
      window.location.href = "signin.html";
      return;
    }
    // Load tasks
    loadTasks();
    // Init theme
    initTheme();
    // Render board
    renderBoard();
    // Wire up events
    quickAddBtn.addEventListener("click", handleQuickAdd);
    quickAddInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleQuickAdd();
      }
    });
    themeToggleBtn.addEventListener("click", toggleTheme);
    overlayEl.addEventListener("click", closeTaskModal);
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveTask();
    });
    cancelTaskBtn.addEventListener("click", closeTaskModal);
    deleteTaskBtn.addEventListener("click", deleteCurrentTask);
    // Stats navigation
    const statsBtn = document.getElementById("statsBtn");
    if (statsBtn) {
      statsBtn.addEventListener("click", () => {
        window.location.href = "stats.html";
      });
    }
    // Sign out
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", () => {
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("userEmail");
        window.location.href = "landing.html";
      });
    }
    // Priority selection buttons
    if (priorityOptions) {
      priorityOptions.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-priority]");
        if (!btn) return;
        const value = btn.getAttribute("data-priority");
        setActivePriority(value);
      });
    }

    // Status selection buttons
    if (statusOptions) {
      statusOptions.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-status]");
        if (!btn) return;
        const value = btn.getAttribute("data-status");
        setActiveStatus(value);
      });
    }

    // Update save button state on input changes
    const inputsToWatch = [taskTitleInput, taskOwnerInput, taskDueInput];
    inputsToWatch.forEach((input) => {
      input.addEventListener("input", updateSaveBtnState);
    });
    if (priorityOptions) {
      priorityOptions.addEventListener("click", updateSaveBtnState);
    }
    if (statusOptions) {
      statusOptions.addEventListener("click", updateSaveBtnState);
    }
  }

  /**
   * Load tasks from localStorage
   */
  function loadTasks() {
    try {
      const stored = localStorage.getItem("taskRoverTasks");
      tasks = stored ? JSON.parse(stored) : [];
    } catch (_) {
      tasks = [];
    }
  }

  /**
   * Save tasks to localStorage
   */
  function persistTasks() {
    try {
      localStorage.setItem("taskRoverTasks", JSON.stringify(tasks));
    } catch (_) {
      // ignore
    }
  }

  /**
   * Initialise theme based on saved preference or system
   */
  function initTheme() {
    const wrapper = document.getElementById("appWrapper");
    let theme = localStorage.getItem("taskRoverTheme");
    if (!theme) {
      const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }
    applyTheme(theme);
    // Set button icon
    themeToggleBtn.textContent = wrapper.classList.contains("dark") ? "☀️" : "🌙";
  }

  /**
   * Apply theme
   * @param {string} mode
   */
  function applyTheme(mode) {
    const wrapper = document.getElementById("appWrapper");
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

  /**
   * Toggle theme
   */
  function toggleTheme() {
    const wrapper = document.getElementById("appWrapper");
    const isDark = wrapper.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
  }

  /**
   * Handle adding task via quick add bar
   */
  function handleQuickAdd() {
    const value = quickAddInput.value.trim();
    if (!value) return;
    const { title, due, priority } = parseInput(value);
    // Open modal for detailed input. Pre‑fill fields from quick add where possible.
    quickAddInput.value = "";
    // Reset modal first
    currentEditId = null;
    modalTitleEl.textContent = "Add Task";
    taskTitleInput.value = title;
    taskDueInput.value = due || "";
    taskOwnerInput.value = "";
    // Default status to "todo"
    setActiveStatus("todo");
    // Pre‑set priority if provided
    setActivePriority(priority || "");
    deleteTaskBtn.style.display = "none";
    overlayEl.classList.remove("hidden");
    overlayEl.classList.add("show");
    taskModalEl.classList.remove("hidden");
    taskModalEl.classList.add("show");
    setTimeout(() => {
      taskTitleInput.focus();
      updateSaveBtnState();
    }, 50);
  }

  /**
   * Parse quick add input for due and priority tokens
   * @param {string} input
   */
  function parseInput(input) {
    let title = input;
    let due;
    let priority;
    const dueMatch = input.match(/@((?:19|20)\d\d-[01]\d-[0-3]\d)/);
    if (dueMatch) {
      due = dueMatch[1];
      title = title.replace(dueMatch[0], "");
    }
    const priMatch = input.match(/!+/);
    if (priMatch) {
      const count = priMatch[0].length;
      if (count === 1) priority = "high";
      if (count === 2) priority = "medium";
      if (count >= 3) priority = "low";
      title = title.replace(priMatch[0], "");
    }
    return { title: title.trim(), due, priority };
  }

  /**
   * Add a task to the list
   */
  function addTask(data) {
    const newTask = {
      id: Date.now().toString(),
      title: data.title,
      due: data.due,
      priority: data.priority,
      status: data.status,
      owner: data.owner || "",
      createdAt: Date.now(),
    };
    tasks.push(newTask);
    persistTasks();
    renderBoard();
  }

  /**
   * Render the kanban board
   */
  function renderBoard() {
    boardEl.innerHTML = "";
    statuses.forEach((status) => {
      const col = document.createElement("section");
      col.className = "column";
      col.dataset.status = status.key;
      // Header row
      const header = document.createElement("div");
      header.className = "column-title";
      const title = document.createElement("span");
      title.textContent = status.label;
      const count = document.createElement("span");
      count.className = "count-chip";
      const tasksForStatus = tasks.filter((t) => t.status === status.key);
      count.textContent = tasksForStatus.length;
      header.appendChild(title);
      header.appendChild(count);
      col.appendChild(header);
      // Setup drop events for column
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("text/plain");
        const task = tasks.find((t) => t.id === taskId);
        if (task && task.status !== status.key) {
          moveTask(task.id, status.key);
          renderBoard();
        }
      });
      // Tasks list
      const list = document.createElement("div");
      list.className = "tasks-list";
      tasksForStatus.sort((a, b) => a.createdAt - b.createdAt).forEach((task) => {
        const card = createTaskCard(task);
        list.appendChild(card);
      });
      col.appendChild(list);
      boardEl.appendChild(col);
    });
  }

  /**
   * Create a DOM element for a task card
   * @param {Object} task
   */
  function createTaskCard(task) {
    const card = document.createElement("div");
    card.className = "task-card";
    card.setAttribute("draggable", "true");
    card.dataset.id = task.id;
    card.dataset.status = task.status;
    // Title
    const titleEl = document.createElement("p");
    titleEl.className = "task-title";
    titleEl.textContent = task.title;
    if (task.status === "done") {
      titleEl.classList.add("done");
    }
    // Meta row
    const meta = document.createElement("div");
    meta.className = "meta-row";
    // Priority dot and label
    if (task.priority) {
      const dot = document.createElement("span");
      dot.className = `priority-dot ${task.priority}`;
      meta.appendChild(dot);
    }
    // Due pill
    if (task.due) {
      const pill = document.createElement("span");
      pill.className = "due-pill";
      pill.textContent = formatDueLabel(task.due);
      if (isDueSoon(task.due)) {
        pill.classList.add("warn");
      }
      meta.appendChild(pill);
    }
    // Owner label
    if (task.owner) {
      const ownerSpan = document.createElement("span");
      ownerSpan.className = "owner-label";
      ownerSpan.textContent = task.owner;
      meta.appendChild(ownerSpan);
    }
    card.appendChild(titleEl);
    if (meta.childNodes.length > 0) {
      card.appendChild(meta);
    }
    card.addEventListener("click", () => {
      openTaskModal(task.id);
    });
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", task.id);
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
    return card;
  }

  /**
   * Format due label
   */
  function formatDueLabel(dateStr) {
    const date = new Date(dateStr + "T00:00:00");
    if (isNaN(date)) return "Due";
    const options = { month: "short", day: "numeric" };
    return `Due ${date.toLocaleDateString(undefined, options)}`;
  }

  /**
   * Check if due date is today or past
   */
  function isDueSoon(dateStr) {
    try {
      const due = new Date(dateStr + "T00:00:00");
      const now = new Date();
      const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return dueDate <= today;
    } catch (_) {
      return false;
    }
  }

  /**
   * Move task to new status
   */
  function moveTask(id, newStatus) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.status = newStatus;
      if (newStatus === "done") {
        showToast("Moved to Done.", () => {
          task.status = "doing";
          persistTasks();
          renderBoard();
        });
      }
      persistTasks();
    }
  }

  /**
   * Open task modal for editing/adding
   */
  function openTaskModal(id) {
    currentEditId = id;
    // Reset priority selection
    setActivePriority("");
    if (id) {
      modalTitleEl.textContent = "Edit Task";
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      taskTitleInput.value = task.title;
      taskDueInput.value = task.due || "";
      taskOwnerInput.value = task.owner || "";
      // Set status buttons
      setActiveStatus(task.status);
      // Set priority selection
      setActivePriority(task.priority || "");
      deleteTaskBtn.style.display = "inline-flex";
    } else {
      modalTitleEl.textContent = "Add Task";
      taskTitleInput.value = "";
      taskDueInput.value = "";
      taskOwnerInput.value = "";
      setActiveStatus("todo");
      setActivePriority("");
      deleteTaskBtn.style.display = "none";
    }
    overlayEl.classList.remove("hidden");
    overlayEl.classList.add("show");
    taskModalEl.classList.remove("hidden");
    taskModalEl.classList.add("show");
    setTimeout(() => {
      taskTitleInput.focus();
      updateSaveBtnState();
    }, 50);
  }

  /**
   * Close modal
   */
  function closeTaskModal() {
    taskModalEl.classList.remove("show");
    overlayEl.classList.remove("show");
    setTimeout(() => {
      overlayEl.classList.add("hidden");
      taskModalEl.classList.add("hidden");
    }, 200);
    currentEditId = null;
  }

  /**
   * Save task from modal
   */
  function saveTask() {
    const title = taskTitleInput.value.trim();
    if (!title) return;
    const due = taskDueInput.value || undefined;
    const owner = taskOwnerInput.value.trim();
    const status = getActiveStatus();
    const priority = getActivePriority();
    // Require all fields to be filled
    if (!owner || !due || !priority || !status) {
      return;
    }
    if (currentEditId) {
      const task = tasks.find((t) => t.id === currentEditId);
      if (task) {
        task.title = title;
        task.due = due;
        task.owner = owner;
        task.status = status;
        task.priority = priority;
        persistTasks();
        renderBoard();
      }
    } else {
      addTask({ title, due, owner, status, priority });
    }
    closeTaskModal();
  }

  /**
   * Delete current task
   */
  function deleteCurrentTask() {
    if (!currentEditId) return;
    const idx = tasks.findIndex((t) => t.id === currentEditId);
    if (idx === -1) return;
    const removed = tasks.splice(idx, 1)[0];
    closeTaskModal();
    persistTasks();
    renderBoard();
    showToast("Task deleted.", () => {
      tasks.splice(idx, 0, removed);
      persistTasks();
      renderBoard();
    });
  }

  /**
   * Priority selection helpers
   */
  function setActivePriority(value) {
    const buttons = priorityOptions.querySelectorAll("button[data-priority]");
    buttons.forEach((btn) => {
      if (btn.getAttribute("data-priority") === value) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    // store selected value on a data attribute on the container for retrieval
    priorityOptions.dataset.value = value || "";
  }
  function getActivePriority() {
    return priorityOptions.dataset.value || undefined;
  }

  /**
   * Status selection helpers
   */
  function setActiveStatus(value) {
    const buttons = statusOptions.querySelectorAll("button[data-status]");
    buttons.forEach((btn) => {
      if (btn.getAttribute("data-status") === value) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    statusOptions.dataset.value = value || "";
  }
  function getActiveStatus() {
    return statusOptions.dataset.value || undefined;
  }

  /**
   * Update the save button disabled state based on required fields
   */
  function updateSaveBtnState() {
    const title = taskTitleInput.value.trim();
    const due = taskDueInput.value;
    const owner = taskOwnerInput.value.trim();
    const priority = getActivePriority();
    const status = getActiveStatus();
    const allFilled = title && owner && due && priority && status;
    if (saveTaskBtn) {
      saveTaskBtn.disabled = !allFilled;
    }
  }

  /**
   * Show toast with optional undo
   */
  function showToast(message, undoFn) {
    if (undoTimer) {
      clearTimeout(undoTimer);
    }
    toastEl.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = message;
    toastEl.appendChild(span);
    if (undoFn) {
      const undoBtn = document.createElement("button");
      undoBtn.textContent = "Undo";
      undoBtn.addEventListener("click", () => {
        undoFn();
        hideToast();
      });
      toastEl.appendChild(undoBtn);
    }
    toastEl.classList.add("show");
    undoTimer = setTimeout(() => {
      hideToast();
      undoTimer = null;
    }, 5000);
  }
  function hideToast() {
    toastEl.classList.remove("show");
    toastEl.innerHTML = "";
  }

  document.addEventListener("DOMContentLoaded", init);
})();