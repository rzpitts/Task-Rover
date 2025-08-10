/*
 * Task Rover application logic
 *
 * This script powers the Task Rover front‑end. It manages the task state,
 * handles user interactions (adding, editing, moving tasks), renders the
 * board, controls theme toggling, and provides simple undo notifications.
 */

(() => {
  /**
   * Application state
   */
  const statuses = [
    { key: "todo", label: "To Do" },
    { key: "doing", label: "In Progress" },
    { key: "done", label: "Done" },
  ];
  let tasks = [];
  let currentEditId = null;
  let undoTimer = null;
  let undoAction = null;

  // DOM elements
  const appWrapper = document.getElementById("appWrapper");
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
  const taskPriorityInput = document.getElementById("taskPriorityInput");
  const taskStatusInput = document.getElementById("taskStatusInput");
  const deleteTaskBtn = document.getElementById("deleteTaskBtn");
  const cancelTaskBtn = document.getElementById("cancelTaskBtn");

  /**
   * Initialise the application
   */
  function init() {
    // Restore tasks from localStorage if available
    try {
      const stored = localStorage.getItem("taskRoverTasks");
      if (stored) {
        tasks = JSON.parse(stored);
      }
    } catch (_) {
      tasks = [];
    }
    // Setup theme based on saved preference or system
    initTheme();
    // Render board initially
    renderBoard();
    // Event listeners
    quickAddBtn.addEventListener("click", handleQuickAdd);
    quickAddInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleQuickAdd();
      }
    });
    themeToggleBtn.addEventListener("click", toggleTheme);
    // Overlay click closes modal
    overlayEl.addEventListener("click", closeTaskModal);
    // Form submission for save
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveTask();
    });
    // Cancel button
    cancelTaskBtn.addEventListener("click", closeTaskModal);
    // Delete button
    deleteTaskBtn.addEventListener("click", deleteCurrentTask);
  }

  /**
   * Initialise theme: load from storage or system preference
   */
  function initTheme() {
    let theme = localStorage.getItem("taskRoverTheme");
    if (!theme) {
      const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }
    setTheme(theme);
  }

  /**
   * Apply the specified theme ("light" or "dark") and update toggle button
   *
   * @param {string} mode
   */
  function setTheme(mode) {
    if (mode === "dark") {
      appWrapper.classList.add("dark");
      themeToggleBtn.textContent = "☀️";
      themeToggleBtn.setAttribute("aria-label", "Switch to light mode");
    } else {
      appWrapper.classList.remove("dark");
      themeToggleBtn.textContent = "🌙";
      themeToggleBtn.setAttribute("aria-label", "Switch to dark mode");
    }
    localStorage.setItem("taskRoverTheme", mode);
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const isDark = appWrapper.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }

  /**
   * Handle adding a task from the quick add bar
   */
  function handleQuickAdd() {
    const value = quickAddInput.value.trim();
    if (!value) return;
    const { title, due, priority } = parseInput(value);
    addTask({ title, due, priority, status: "todo" });
    quickAddInput.value = "";
  }

  /**
   * Parse user input for due date (prefixed with @) and priority (!).
   * Returns an object with title, due (YYYY-MM-DD or undefined), and priority.
   *
   * @param {string} input
   */
  function parseInput(input) {
    let title = input;
    let due;
    let priority;
    // Extract due date pattern @yyyy-mm-dd
    const dueMatch = input.match(/@((?:19|20)\d\d-[01]\d-[0-3]\d)/);
    if (dueMatch) {
      due = dueMatch[1];
      title = title.replace(dueMatch[0], "");
    }
    // Priority indicated by ! characters; treat ! as high, !! as medium, !!! as low
    const priorityMatch = input.match(/!+/);
    if (priorityMatch) {
      const count = priorityMatch[0].length;
      if (count === 1) priority = "high";
      if (count === 2) priority = "medium";
      if (count >= 3) priority = "low";
      title = title.replace(priorityMatch[0], "");
    }
    return {
      title: title.trim(),
      due,
      priority,
    };
  }

  /**
   * Add a new task to the task list
   *
   * @param {{title: string, due?: string, priority?: string, status: string}} data
   */
  function addTask(data) {
    const newTask = {
      id: Date.now().toString(),
      title: data.title,
      due: data.due,
      priority: data.priority,
      status: data.status,
      createdAt: Date.now(),
    };
    tasks.push(newTask);
    persistTasks();
    renderBoard();
  }

  /**
   * Persist tasks to localStorage
   */
  function persistTasks() {
    try {
      localStorage.setItem("taskRoverTasks", JSON.stringify(tasks));
    } catch (_) {
      // ignore
    }
  }

  /**
   * Render the entire board, including all columns and task cards
   */
  function renderBoard() {
    // Clear board
    boardEl.innerHTML = "";
    statuses.forEach((status) => {
      // Create column container
      const col = document.createElement("section");
      col.className = "column";
      col.dataset.status = status.key;
      // Column header
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
      // Task list container
      const list = document.createElement("div");
      list.className = "tasks-list";
      // Set up drag events on the entire column (not just the list) to improve drop targeting
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
      // Render each task card
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
   *
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
    // Priority dot
    if (task.priority) {
      const dot = document.createElement("span");
      dot.className = `priority-dot ${task.priority}`;
      meta.appendChild(dot);
    }
    // Due date pill
    if (task.due) {
      const pill = document.createElement("span");
      pill.className = "due-pill";
      pill.textContent = formatDueLabel(task.due);
      // Mark warn if overdue or due today
      if (isDueSoon(task.due)) {
        pill.classList.add("warn");
      }
      meta.appendChild(pill);
    }
    // Add elements to card
    card.appendChild(titleEl);
    if (meta.childNodes.length > 0) {
      card.appendChild(meta);
    }
    // Events
    card.addEventListener("click", () => {
      openTaskModal(task.id);
    });
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", task.id);
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
    return card;
  }

  /**
   * Format due date for display
   *
   * @param {string} dateStr
   */
  function formatDueLabel(dateStr) {
    // Parse date string as local date (avoid timezone shifting)
    const date = new Date(dateStr + "T00:00:00");
    if (isNaN(date)) return "Due";
    const options = { month: "short", day: "numeric" };
    const formatted = date.toLocaleDateString(undefined, options);
    return `Due ${formatted}`;
  }

  /**
   * Determine if a task is due soon (today or past)
   *
   * @param {string} dateStr
   */
  function isDueSoon(dateStr) {
    try {
      const due = new Date(dateStr + "T00:00:00");
      const now = new Date();
      // Remove time portion for comparison
      const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return dueDate <= today;
    } catch (_) {
      return false;
    }
  }

  /**
   * Move a task to a new status
   *
   * @param {string} id
   * @param {string} newStatus
   */
  function moveTask(id, newStatus) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.status = newStatus;
      // If moving to done, we can show undo toast
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
   * Open the task modal for creating or editing a task
   *
   * @param {string|null} id
   */
  function openTaskModal(id) {
    currentEditId = id;
    if (id) {
      // Editing existing task
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      modalTitleEl.textContent = "Edit Task";
      taskTitleInput.value = task.title;
      taskDueInput.value = task.due || "";
      taskPriorityInput.value = task.priority || "";
      taskStatusInput.value = task.status;
      deleteTaskBtn.style.display = "inline-flex";
    } else {
      // Adding new task
      modalTitleEl.textContent = "Add Task";
      taskTitleInput.value = "";
      taskDueInput.value = "";
      taskPriorityInput.value = "";
      taskStatusInput.value = "todo";
      deleteTaskBtn.style.display = "none";
    }
    overlayEl.classList.add("show");
    overlayEl.classList.remove("hidden");
    taskModalEl.classList.add("show");
    taskModalEl.classList.remove("hidden");
    // Autofocus title input
    setTimeout(() => {
      taskTitleInput.focus();
    }, 50);
  }

  /**
   * Close the task modal
   */
  function closeTaskModal() {
    taskModalEl.classList.remove("show");
    overlayEl.classList.remove("show");
    // Wait for transition before hiding completely
    setTimeout(() => {
      taskModalEl.classList.add("hidden");
      overlayEl.classList.add("hidden");
    }, 200);
    currentEditId = null;
  }

  /**
   * Save changes from the modal (add or edit a task)
   */
  function saveTask() {
    const title = taskTitleInput.value.trim();
    if (!title) return;
    const due = taskDueInput.value || undefined;
    const priority = taskPriorityInput.value || undefined;
    const status = taskStatusInput.value;
    if (currentEditId) {
      // Update existing task
      const task = tasks.find((t) => t.id === currentEditId);
      if (task) {
        task.title = title;
        task.due = due;
        task.priority = priority;
        task.status = status;
        persistTasks();
        renderBoard();
      }
    } else {
      // New task creation
      addTask({ title, due, priority, status });
    }
    closeTaskModal();
  }

  /**
   * Delete the currently edited task
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
      // Undo deletion
      tasks.splice(idx, 0, removed);
      persistTasks();
      renderBoard();
    });
  }

  /**
   * Show a toast message with optional undo action
   *
   * @param {string} message
   * @param {Function} [undoFn]
   */
  function showToast(message, undoFn) {
    // Clear existing timer
    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
    // Clear previous content
    toastEl.innerHTML = "";
    const msgSpan = document.createElement("span");
    msgSpan.textContent = message;
    toastEl.appendChild(msgSpan);
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
    // Auto-hide after 5 seconds
    undoTimer = setTimeout(() => {
      hideToast();
      undoTimer = null;
    }, 5000);
  }

  /**
   * Hide the toast message
   */
  function hideToast() {
    toastEl.classList.remove("show");
    toastEl.innerHTML = "";
  }

  // Kick off the app when DOM is ready
  document.addEventListener("DOMContentLoaded", init);
})();