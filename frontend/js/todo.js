const TODO_API = "http://127.0.0.1:9999/todos";

// Helper function to get authorization headers
function getAuthHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function fetchTodos() {
  try {
    const res = await fetch(TODO_API, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Unauthorized - redirect to login
        window.location.href = "auth/login.html";
      }
      return;
    }

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
                <button class="completeBtn" data-id="${todo.id}" data-completed="${todo.completed}">✔</button>
                <button class="deleteBtn" data-id="${todo.id}">🗑</button>
              </div>
          `;

      if (todo.completed) li.style.opacity = "0.5";

      list.appendChild(li);
      checkNotification(todo);
    });

    // Attach event listeners to dynamically created buttons
    document.querySelectorAll(".completeBtn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        const completed = this.getAttribute("data-completed") === "1" ? 1 : 0;
        completeTask(id, completed);
      });
    });

    document.querySelectorAll(".deleteBtn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        deleteTask(id);
      });
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
  }
}

async function addTask() {
  console.log("addTask called"); // DEBUG
  const title = document.getElementById("title").value;
  const priority = document.getElementById("priority").value;
  const dueDate = document.getElementById("dueDate").value;

  console.log("Task data:", { title, priority, dueDate }); // DEBUG

  if (!title) return alert("Enter task");

  try {
    console.log("Sending request to API:", TODO_API); // DEBUG
    const res = await fetch(TODO_API, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, priority, due_date: dueDate }),
    });

    console.log("Response status:", res.status); // DEBUG

    if (res.ok) {
      document.getElementById("title").value = "";
      fetchTodos();
    } else {
      const errorData = await res.json();
      console.error("API Error:", errorData); // DEBUG
      alert("Failed to add task");
    }
  } catch (error) {
    console.error("Error adding task:", error);
  }
}

async function deleteTask(id) {
  try {
    const res = await fetch(TODO_API + "/" + id, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      fetchTodos();
    } else {
      alert("Failed to delete task");
    }
  } catch (error) {
    console.error("Error deleting task:", error);
  }
}

async function completeTask(id, completed) {
  try {
    const res = await fetch(TODO_API + "/" + id, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        completed: completed ? 0 : 1,
      }),
    });

    if (res.ok) {
      fetchTodos();
    } else {
      alert("Failed to update task");
    }
  } catch (error) {
    console.error("Error updating task:", error);
  }
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

// Attach event listeners after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired"); // DEBUG
  const addTaskButton = document.getElementById("addTaskButton");
  console.log("addTaskButton element:", addTaskButton); // DEBUG
  if (addTaskButton) {
    addTaskButton.addEventListener("click", addTask);
    console.log("Attached click listener to addTaskButton"); // DEBUG
  } else {
    console.error("addTaskButton not found!"); // DEBUG
  }
  fetchTodos();
});
