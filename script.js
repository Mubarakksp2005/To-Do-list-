const STORAGE_KEY = "todo-app-tasks";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const emptyState = document.querySelector("#empty-state");
const filterButtons = document.querySelectorAll(".filter");

let tasks = loadTasks();
let activeFilter = "all";

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function escapeText(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function getVisibleTasks() {
  if (activeFilter === "active") return tasks.filter((task) => !task.completed);
  if (activeFilter === "completed") return tasks.filter((task) => task.completed);
  return tasks;
}

function render() {
  const visibleTasks = getVisibleTasks();
  const remaining = tasks.filter((task) => !task.completed).length;

  taskCount.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"}`;
  taskList.innerHTML = visibleTasks
    .map(
      (task) => `
        <li class="task-item${task.completed ? " is-completed" : "}" data-id="${task.id}">
          <button class="task-toggle" type="button" aria-label="${task.completed ? "Mark active" : "Mark complete"}"></button>
          <span class="task-text">${escapeText(task.text)}</span>
          <button class="delete-task" type="button" aria-label="Delete task">×</button>
        </li>
      `,
    )
    .join("");

  emptyState.hidden = visibleTasks.length > 0;
  emptyState.textContent =
    activeFilter === "all"
      ? "No tasks yet. Add one above!"
      : `No ${activeFilter} tasks.`;
}

taskForm.addEventListener("submit", (event) => {
  event.preventEvent?.();
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) return;

  tasks.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
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

  if (event.target.closest(".task-toggle")) {
    tasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task,
    );
  }

  if (event.target.closest(".delete-task")) {
    tasks = tasks.filter((task) => task.id !== id);
  }

  saveTasks();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((filter) => filter.classList.remove("is-active"));
    button.classList.add("is-active");
    render();
  });
});

render();
