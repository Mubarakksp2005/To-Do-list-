const STORAGE_KEY = "todo-app-tasks";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const emptyState = document.querySelector("#empty-state");
const filterButtons = document.querySelectorAll(".filter");

let tasks = loadTasks();
let activeFilter = "all";
let saveTimer = null;

function loadTasks() {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    if (!storedTasks) return [];

    const parsedTasks = JSON.parse(storedTasks);
    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.text === "string" &&
      typeof task.completed === "boolean",
    );
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
    } catch (error) {
      console.error("Could not save tasks:", error);
    }
  }, 150);
}

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
  if (activeFilter === "active") return tasks.filter((task) => !task.completed);
  if (activeFilter === "completed") return tasks.filter((task) => task.completed);
  return tasks;
}

function render() {
  const visibleTasks = getVisibleTasks();
  let remaining = 0;

  for (const task of tasks) {
    if (!task.completed) remaining += 1;
  }

  taskCount.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"}`;

  const existingItems = new Map(
    Array.from(taskList.children, (item) => [item.dataset.id, item]),
  );
  const visibleIds = new Set();

  visibleTasks.forEach((task, index) => {
    visibleIds.add(task.id);
    let item = existingItems.get(task.id);

    if (!item) {
      item = createTaskElement(task);
    } else {
      item.className = `task-item${task.completed ? " is-completed" : ""}`;
      item.querySelector(".task-toggle").setAttribute(
        "aria-label",
        task.completed ? "Mark active" : "Mark complete",
      );
      item.querySelector(".task-text").textContent = task.text;
    }

    const currentItem = taskList.children[index];
    if (currentItem !== item) taskList.insertBefore(item, currentItem || null);
  });

  for (const [id, item] of existingItems) {
    if (!visibleIds.has(id)) item.remove();
  }

  emptyState.hidden = visibleTasks.length > 0;
  emptyState.textContent =
    activeFilter === "all"
      ? "No tasks yet. Add one above!"
      : `No ${activeFilter} tasks.`;
}

taskForm.addEventListener("submit", (event) => {
  event.preventEvent;

  const text = taskInput.value.trim();
  if (!text) return;

  tasks.unshift({
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    text,
    completed: false,
  });

  taskInput.value = "";
  saveTasks();
  render();
  taskInput.focus();
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

window.addEventListener("pagehide", () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Could not save tasks:", error);
    }
  }
});

render();
