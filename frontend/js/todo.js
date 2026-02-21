const TODO_API = "http://127.0.0.1:9999/todos";

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
                <button class="editBtn" data-id="${todo.id}">✏️</button>
                <button class="deleteBtn" data-id="${todo.id}">🗑</button>
              </div>
          `;

      if (todo.completed) li.style.opacity = "0.5";

      list.appendChild(li);
      setTimeout(() => li.classList.add("enter"), 20);
      checkNotification(todo);
    });

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

    // STEP 5: Add event listener for edit button
    document.querySelectorAll(".editBtn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        editTask(id);
      });
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
  }
}

async function addTask() {
  console.log("addTask called");
  const title = document.getElementById("title").value;
  const priority = document.getElementById("priority").value;
  const dueDate = document.getElementById("dueDate").value;

  console.log("Task data:", { title, priority, dueDate });

  if (!title) return alert("Enter task");

  try {
    console.log("Sending request to API:", TODO_API);
    const res = await fetch(TODO_API, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, priority, due_date: dueDate }),
    });

    console.log("Response status:", res.status);

    if (res.ok) {
      document.getElementById("title").value = "";
      fetchTodos();
    } else {
      const errorData = await res.json();
      console.error("API Error:", errorData);
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

// ===== EDIT TASK FUNCTION =====
// STEP 1: Create editTask function to open modal with current task data
async function editTask(id) {
  // Fetch the specific task data from the current todos to populate the modal
  const todoList = document.getElementById("todoList");
  const todoItems = Array.from(todoList.querySelectorAll("li"));
  
  // Get the task element that contains this ID
  const todoElement = todoList.querySelector(`li:has(button[data-id="${id}"])`);
  
  // Extract task data from the DOM
  const titleText = todoElement.querySelector("b").textContent;
  const priorityText = todoElement.querySelector("span").textContent.match(/\((.*?)\)/)[1];
  const dueText = todoElement.querySelector("small").textContent.replace("Due: ", "");
  const dueDate = dueText === "No date" ? "" : dueText;
  
  // Populate the modal form with current task data
  document.getElementById("editTitle").value = titleText;
  document.getElementById("editPriority").value = priorityText;
  document.getElementById("editDueDate").value = dateToInput(dueDate);
  
  // Store the task ID in the modal for saveEditTask() to use
  document.getElementById("editModal").setAttribute("data-edit-id", id);
  
  // Show the edit modal
  document.getElementById("editModal").classList.add("active");
}

// STEP 2: Create saveEditTask function to update task via API
async function saveEditTask() {
  // Get the task ID from the modal's data attribute
  const id = document.getElementById("editModal").getAttribute("data-edit-id");
  
  // Get the updated values from the form inputs
  const updatedTitle = document.getElementById("editTitle").value;
  const updatedPriority = document.getElementById("editPriority").value;
  const updatedDueDate = document.getElementById("editDueDate").value;

  // Validate that title is not empty
  if (!updatedTitle) {
    alert("Task title cannot be empty");
    return;
  }
  
  try {
    // Send PUT request to TODO_API with the updated data
    const res = await fetch(TODO_API + "/" + id, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: updatedTitle,
        priority: updatedPriority,
        due_date: updatedDueDate
      }),
    });

    // If successful, close modal and refresh todos
    if (res.ok) {
      cancelEdit();
      fetchTodos();
    } else {
      // If failed, show error alert
      alert("Failed to update task");
    }
  } catch (error) {
    console.error("Error updating task:", error);
    alert("Error updating task");
  }
}

// STEP 3: Create cancelEdit function to close modal without saving
function cancelEdit() {
  // Hide the edit modal
  document.getElementById("editModal").classList.remove("active");
  
  // Clear the form inputs
  document.getElementById("editTitle").value = "";
  document.getElementById("editPriority").value = "Medium";
  document.getElementById("editDueDate").value = "";
}

// Helper function to convert date format for input field
function dateToInput(dateString) {
  if (!dateString || dateString === "No date") return "";
  // Assume dateString is in format YYYY-MM-DD, which is what input expects
  return dateString;
}

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

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");
  const addTaskButton = document.getElementById("addTaskButton");
  console.log("addTaskButton element:", addTaskButton);
  if (addTaskButton) {
    addTaskButton.addEventListener("click", addTask);
    console.log("Attached click listener to addTaskButton");
  } else {
    console.error("addTaskButton not found!");
  }
  fetchTodos();
});

(function () {
  function ripple(btn, x, y) {
    const r = document.createElement("span");
    r.className = "ripple";
    r.style.left = x + "px";
    r.style.top = y + "px";
    r.style.position = "absolute";
    r.style.pointerEvents = "none";
    btn.style.position = btn.style.position || "relative";
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".floating-btn");
    if (btn) {
      const rect = btn.getBoundingClientRect();
      ripple(btn, e.clientX - rect.left, e.clientY - rect.top);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    document
      .querySelectorAll("#todoList li")
      .forEach((it, i) => setTimeout(() => it.classList.add("enter"), i * 40));
  });
})();

const _style = document.createElement("style");
_style.innerHTML = `
.ripple{position:absolute;border-radius:50%;transform:scale(0);background:rgba(255,255,255,0.4);animation:ripple 600ms ease-out;width:120px;height:120px;margin-left:-60px;margin-top:-60px;opacity:0.9}
@keyframes ripple{to{transform:scale(1);opacity:0}}
`;
document.head.appendChild(_style);
