const STORAGE_KEY = "todo-app-tasks";
const THEME_KEY = "todo-app-theme";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskSearch = document.querySelector("#task-search");
const taskSort = document.querySelector("#task-sort");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const emptyState = document.querySelector("#empty-state");
const filterButtons = document.querySelectorAll(".filter");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = themeToggle?.querySelector(".theme-icon");
const themeMeta = document.querySelector('meta[name="theme-color"]');

let tasks = loadTasks();
let activeFilter = "all";
let searchQuery = "";
let sortMode = "newest";
let saveTimer = null;

function loadTasks() {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    if (!storedTasks) return [];

    const parsedTasks = JSON.parse(storedTasks);
    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks
      .filter((task) => task && typeof task.id === "string" && typeof task.text === "string" && typeof task.completed === "boolean")
      .map((task) => ({ createdAt: typeof task.createdAt === "number" ? task.createdAt : 0, ...task }));
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      saveTimer = null;
    } catch (error) {
      console.error("Could not save tasks:", error);
      saveTimer = null;
    }
  }, 150);
}

function flushTasks() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Could not save tasks:", error);
  } finally {
    saveTimer = null;
  }
}

function getTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function updateThemeControls() {
  const isDark = getTheme() === "dark";
  if (themeToggle) {
    themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
    themeToggle.title = `Switch to ${isDark ? "light" : "dark"} theme`;
  }
  if (themeIcon) themeIcon.textContent = isDark ? "🌙" : "☀️";
  if (themeMeta) themeMeta.setAttribute("content", isDark ? "#16131d" : "#7c3aed");
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  updateThemeControls();
}

themeToggle?.addEventListener("click", () => {
  setTheme(getTheme() === "dark" ? "light" : "dark");
});

const systemTheme = matchMedia("(prefers-color-scheme: dark)");
systemTheme.addEventListener?.("change", (event) => {
  if (!localStorage.getItem(THEME_KEY)) setTheme(event.matches ? "dark" : "light");
});

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-completed" : ""}`;
  item.dataset.id = task.id;

  const toggle = document.createElement("button");
  toggle.className = "task-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", task.completed ? "Mark active" : "Mark complete");

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-task";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", "Delete task");
  deleteButton.textContent = "×";

  item.append(toggle, text, deleteButton);
  return item;
}

function getVisibleTasks() {
  let visibleTasks = tasks;

  if (activeFilter === "active") visibleTasks = visibleTasks.filter((task) => !task.completed);
  if (activeFilter === "completed") visibleTasks = visibleTasks.filter((task) => task.completed);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  if (normalizedQuery) {
    visibleTasks = visibleTasks.filter((task) => task.text.toLocaleLowerCase().includes(normalizedQuery));
  }

  const sortedTasks = [...visibleTasks];
  sortedTasks.sort((first, second) => {
    if (sortMode === "oldest") return first.createdAt - second.createdAt;
    if (sortMode === "alphabetical") return first.text.localeCompare(second.text, undefined, { sensitivity: "base" });
    if (sortMode === "active") return Number(second.completed) - Number(first.completed);
    if (sortMode === "completed") return Number(first.completed) - Number(second.completed);
    return second.createdAt - first.createdAt;
  });

  return sortedTasks;
}

function render() {
  const visibleTasks = getVisibleTasks();
  let remaining = 0;
  for (const task of tasks) if (!task.completed) remaining += 1;

  taskCount.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"}`;

  const existingItems = new Map(Array.from(taskList.children, (item) => [item.dataset.id, item]));
  const visibleIds = new Set();

  visibleTasks.forEach((task, index) => {
    visibleIds.add(task.id);
    let item = existingItems.get(task.id);

    if (!item) {
      item = createTaskElement(task);
    } else {
      item.className = `task-item${task.completed ? " is-completed" : ""}`;
      item.querySelector(".task-toggle").setAttribute("aria-label", task.completed ? "Mark active" : "Mark complete");
      item.querySelector(".task-text").textContent = task.text;
    }

    const currentItem = taskList.children[index];
    if (currentItem !== item) taskList.insertBefore(item, currentItem || null);
  });

  for (const [id, item] of existingItems) if (!visibleIds.has(id)) item.remove();

  emptyState.hidden = visibleTasks.length > 0;
  emptyState.textContent = searchQuery.trim()
    ? `No tasks match “${searchQuery.trim()}”.`
    : activeFilter === "all"
      ? "No tasks yet. Add one above!"
      : `No ${activeFilter} tasks.`;
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;

  tasks.unshift({
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    completed: false,
    createdAt: Date.now(),
  });

  taskInput.value = "";
  saveTasks();
  render();
  taskInput.focus();
});

taskSearch.addEventListener("input", () => {
  searchQuery = taskSearch.value;
  render();
});

taskSort.addEventListener("change", () => {
  sortMode = taskSort.value;
  render();
});

taskList.addEventListener("click", (event) => {
  const item = event.target.closest(".task-item");
  if (!item) return;

  const id = item.dataset.id;
  const task = tasks.find((candidate) => candidate.id === id);
  if (!task) return;

  let changed = false;
  if (event.target.closest(".task-toggle")) {
    task.completed = !task.completed;
    changed = true;
  } else if (event.target.closest(".delete-task")) {
    tasks = tasks.filter((candidate) => candidate.id !== id);
    changed = true;
  }

  if (changed) {
    saveTasks();
    render();
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((filter) => filter.classList.remove("is-active"));
    button.classList.add("is-active");
    render();
  });
});

window.addEventListener("pagehide", flushTasks);

updateThemeControls();
render();
