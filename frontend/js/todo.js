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
                <button class="deleteBtn" data-id="${todo.id}">🗑</button>
                <!-- ADD EDIT BUTTON HERE: <button class="editBtn" data-id="${todo.id}">✏️</button> -->
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
  // TODO: Fetch the specific task data from the todos list (from the DOM or API)
  // TODO: Show the edit modal
  // TODO: Populate the modal form with current task data (title, priority, due_date)
  // TODO: Set a data attribute on the modal to track which task ID is being edited
}

// STEP 2: Create saveEditTask function to update task via API
async function saveEditTask(id) {
  // TODO: Get the updated values from the form inputs
  // const updatedTitle = document.getElementById("editTitle").value;
  // const updatedPriority = document.getElementById("editPriority").value;
  // const updatedDueDate = document.getElementById("editDueDate").value;

  // TODO: Validate that title is not empty
  
  // TODO: Send PUT request to TODO_API + "/" + id with the updated data
  // const res = await fetch(TODO_API + "/" + id, {
  //   method: "PUT",
  //   headers: getAuthHeaders(),
  //   body: JSON.stringify({
  //     title: updatedTitle,
  //     priority: updatedPriority,
  //     due_date: updatedDueDate
  //   }),
  // });

  // TODO: If successful, close modal and refresh todos
  // TODO: If failed, show error alert
}

// STEP 3: Create cancelEdit function to close modal without saving
function cancelEdit() {
  // TODO: Hide the edit modal
  // TODO: Clear the form inputs
}

// STEP 4: Add edit button to the HTML in fetchTodos()
// In the fetchTodos() function, add this button next to completeBtn and deleteBtn:
// <button class="editBtn" data-id="${todo.id}">✏️</button>

// STEP 5: Add event listener for edit button in fetchTodos()
// After the deleteBtn event listeners, add:
// document.querySelectorAll(".editBtn").forEach((btn) => {
//   btn.addEventListener("click", function () {
//     const id = this.getAttribute("data-id");
//     editTask(id);
//   });
// });

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
