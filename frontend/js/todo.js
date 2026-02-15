const API = "http://127.0.0.1:5000/todos";

async function fetchTodos() {
  const res = await fetch(API);
  const data = await res.json();

  const list = document.getElementById("todoList");
  list.innerHTML = "";

  data.forEach((todo) => {
    const li = document.createElement("li");

    let priorityClass = "";
    if (todo.priority === "High") priorityClass = "priority-high";
    if (todo.priority === "Medium") priorityClass = "priority-medium";
    if (todo.priority === "Low") priorityClass = "priority-low";

    li.innerHTML = `
            <div>
              <b>${todo.title}</b> 
              <span class="${priorityClass}">(${todo.priority})</span>
              <br>
              <small>Due: ${todo.due_date || "No date"}</small>
            </div>

            <div>
              <button onclick="completeTask(${todo.id},${todo.completed})">✔</button>
              <button onclick="deleteTask(${todo.id})">🗑</button>
            </div>
        `;

    if (todo.completed) li.style.opacity = "0.5";

    list.appendChild(li);
    checkNotification(todo);
  });
}

async function addTask() {
  const title = document.getElementById("title").value;
  const priority = document.getElementById("priority").value;
  const dueDate = document.getElementById("dueDate").value;

  if (!title) return alert("Enter task");

  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, priority, due_date: dueDate }),
  });

  document.getElementById("title").value = "";
  fetchTodos();
}

async function deleteTask(id) {
  await fetch(API + "/" + id, { method: "DELETE" });
  fetchTodos();
}

async function completeTask(id, completed) {
  await fetch(API + "/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      completed: completed ? 0 : 1,
    }),
  });
  fetchTodos();
}

/* 🔔 Notification */
function checkNotification(todo) {
  if (!todo.due_date) return;

  let today = new Date().toISOString().split("T")[0];

  if (today === todo.due_date && !todo.completed) {
    if (Notification.permission === "granted") {
      new Notification("Task Due Today: " + todo.title);
    }
  }
}

if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

fetchTodos();
