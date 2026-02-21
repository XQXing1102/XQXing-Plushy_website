const TODO_API = "http://127.0.0.1:9999/todos";
const FOLDERS_API = "http://127.0.0.1:9999/folders";

// ===== GLOBAL STATE FOR FOLDERS =====
let currentFolderId = null; // Track which folder is currently selected
let timeFormat = localStorage.getItem("timeFormat") || "24h"; // 24h or 12h

function getAuthHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ===== TIME FORMAT HELPER FUNCTIONS =====
// Convert 24-hour time to 12-hour AM/PM format
function convertTo12Hour(time24) {
  if (!time24) return "No time";
  const [hours, minutes] = time24.split(":");
  const h = parseInt(hours);
  const m = minutes || "00";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

// Format time for display based on user's preference
function formatTimeDisplay(time) {
  if (!time) return "No time";
  return timeFormat === "12h" ? convertTo12Hour(time) : time;
}

// Toggle time format between 12h and 24h
function toggleTimeFormat() {
  timeFormat = timeFormat === "24h" ? "12h" : "24h";
  localStorage.setItem("timeFormat", timeFormat);
  // Update display
  const formatBtn = document.getElementById("timeFormatBtn");
  if (formatBtn) {
    formatBtn.textContent = timeFormat === "24h" ? "24H" : "12H";
  }
  fetchTodos(currentFolderId);
}

async function fetchTodos(folderId = null) {
  try {
    const url = folderId ? TODO_API + "?folder_id=" + folderId : TODO_API;
    const res = await fetch(url, {
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
                <small>Due: ${todo.due_date || "No date"} @ ${formatTimeDisplay(todo.due_time || "23:59")}</small>
              </div>

              <div class="todo-actions">
                <button class="completeBtn" data-id="${todo.id}" data-completed="${todo.completed}">✔</button>
                <button class="editBtn" data-id="${todo.id}">✏️</button>
                <button class="deleteBtn" data-id="${todo.id}">🗑</button>
              </div>
          `;

      // Store task data in data attributes for editing
      li.setAttribute("data-todo-id", todo.id);
      li.setAttribute("data-todo-title", todo.title);
      li.setAttribute("data-todo-priority", todo.priority);
      li.setAttribute("data-todo-date", todo.due_date || "");
      li.setAttribute("data-todo-time", todo.due_time || "23:59");

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
  let dueDate = document.getElementById("dueDate").value;
  let dueTime = document.getElementById("dueTime").value;

  // If no date provided, default to today's local date
  if (!dueDate) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dueDate = `${year}-${month}-${day}`;
  }

  // If no time provided, default to 23:59
  if (!dueTime) {
    dueTime = "23:59";
  }

  console.log("Task data:", { title, priority, dueDate, dueTime });

  if (!title) return alert("Enter task");

  try {
    console.log("Sending request to API:", TODO_API);
    const res = await fetch(TODO_API, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        title, 
        priority, 
        due_date: dueDate,
        due_time: dueTime,
        folder_id: currentFolderId
      }),
    });

    console.log("Response status:", res.status);

    if (res.ok) {
      document.getElementById("title").value = "";
      document.getElementById("dueTime").value = "";
      fetchTodos(currentFolderId);
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
      fetchTodos(currentFolderId);
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
      fetchTodos(currentFolderId);
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
  // Get the task element that contains this ID
  const todoList = document.getElementById("todoList");
  const todoElement = todoList.querySelector(`li[data-todo-id="${id}"]`);
  
  if (!todoElement) {
    alert("Task not found");
    return;
  }

  // Extract task data from the data attributes
  const titleText = todoElement.getAttribute("data-todo-title");
  const priorityText = todoElement.getAttribute("data-todo-priority");
  const dueDate = todoElement.getAttribute("data-todo-date");
  const dueTime = todoElement.getAttribute("data-todo-time") || "23:59";
  
  // Populate the modal form with current task data
  document.getElementById("editTitle").value = titleText;
  document.getElementById("editPriority").value = priorityText;
  document.getElementById("editDueDate").value = dueDate;
  document.getElementById("editDueTime").value = dueTime;
  
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
  const updatedDueTime = document.getElementById("editDueTime").value || "23:59";

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
        due_date: updatedDueDate,
        due_time: updatedDueTime
      }),
    });

    // If successful, close modal and refresh todos
    if (res.ok) {
      cancelEdit();
      fetchTodos(currentFolderId);
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

// ================================
// ===== FOLDER MANAGEMENT =====
// ================================

// STEP 1: Fetch all folders from backend
async function fetchFolders() {
  try {
    const res = await fetch(FOLDERS_API, { 
      headers: getAuthHeaders() 
    });

    if (!res.ok) {
      console.error("Failed to fetch folders");
      return;
    }

    const folders = await res.json();
    const folderList = document.getElementById("folderList");
    
    if (!folderList) {
      console.error("folderList element not found");
      return;
    }
    
    folderList.innerHTML = "";

    if (folders.length === 0) {
      folderList.innerHTML = '<div class="empty-folder-message">No folders yet. Create one!</div>';
      return;
    }

    folders.forEach((folder) => {
      const folderItem = document.createElement("div");
      folderItem.className = "folder-item";
      folderItem.setAttribute("data-folder-id", folder.id);
      
      folderItem.innerHTML = `
        <div class="folder-name" onclick="selectFolder(${folder.id})">
          📁 ${folder.name}
        </div>
        <div class="folder-actions">
          <button class="folder-btn rename-btn" onclick="renameFolder(${folder.id})" title="Rename">✏️</button>
          <button class="folder-btn delete-btn" onclick="deleteFolder(${folder.id})" title="Delete">🗑</button>
        </div>
      `;
      
      folderList.appendChild(folderItem);
    });

    // Auto-select the first folder if none is selected
    if (!currentFolderId && folders.length > 0) {
      selectFolder(folders[0].id);
    }

  } catch (error) {
    console.error("Error fetching folders:", error);
  }
}

// STEP 2: Create a new folder
async function createFolder() {
  const folderInput = document.getElementById("folderInput");
  const folderName = folderInput.value.trim();

  if (!folderName) {
    alert("Enter folder name");
    return;
  }

  try {
    const res = await fetch(FOLDERS_API, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: folderName }),
    });

    if (res.ok) {
      folderInput.value = "";
      fetchFolders();
      // Auto-select the newly created folder
      const folders = await fetch(FOLDERS_API, { headers: getAuthHeaders() }).then(r => r.json());
      if (folders.length > 0) {
        selectFolder(folders[folders.length - 1].id);
      }
    } else {
      alert("Failed to create folder");
    }
  } catch (error) {
    console.error("Error creating folder:", error);
  }
}

// STEP 3: Delete a folder
async function deleteFolder(folderId) {
  if (!confirm("Delete this folder and all its todos?")) return;

  try {
    const res = await fetch(FOLDERS_API + "/" + folderId, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      if (currentFolderId === folderId) {
        currentFolderId = null;
      }
      fetchFolders();
      fetchTodos();
    } else {
      alert("Failed to delete folder");
    }
  } catch (error) {
    console.error("Error deleting folder:", error);
  }
}

// STEP 4: Rename/Update folder
async function renameFolder(folderId) {
  const newName = prompt("Enter new folder name:");
  if (!newName) return;

  try {
    const res = await fetch(FOLDERS_API + "/" + folderId, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      fetchFolders();
    } else {
      alert("Failed to rename folder");
    }
  } catch (error) {
    console.error("Error renaming folder:", error);
  }
}

// STEP 5: Select a folder and display its todos
async function selectFolder(folderId) {
  currentFolderId = folderId;

  // Update UI to highlight the selected folder
  document.querySelectorAll(".folder-item").forEach(item => {
    item.classList.remove("active");
  });
  if (folderId) {
    document.querySelector(`[data-folder-id="${folderId}"]`).classList.add("active");
  }

  // Fetch and display todos for this folder
  fetchTodos(folderId);
}

// STEP 6: Modify fetchTodos to accept folderId parameter
// Update existing fetchTodos function:
// async function fetchTodos(folderId = null) {
//   const url = folderId ? TODO_API + "?folder_id=" + folderId : TODO_API;
//   // Rest of fetchTodos logic...
//   // This filters todos to only show those in the selected folder
// }

// STEP 7: Modify addTask to include folder_id
// Update existing addTask function:
// const folderIdToAdd = currentFolderId || null;
// body: JSON.stringify({ 
//   title, 
//   priority, 
//   due_date: dueDate,
//   folder_id: folderIdToAdd  // Add this line
// }),

// STEP 8: HTML Changes Needed
// In todo.html, add:
// - Sidebar/folder navigation panel (before or beside todo-card)
// - Folder list display area (id="folderList")
// - Folder creation input (id="folderInput") and button
// - Update fetchTodos() call on page load to load default folder

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
  
  // Initialize time format button
  const timeFormatBtn = document.getElementById("timeFormatBtn");
  if (timeFormatBtn) {
    timeFormatBtn.textContent = timeFormat === "24h" ? "24H" : "12H";
  }
  
  // Initialize folders on page load
  fetchFolders();
  
  // Attach event listener for folder creation button
  const createFolderBtn = document.getElementById("createFolderBtn");
  if (createFolderBtn) {
    createFolderBtn.addEventListener("click", createFolder);
  }
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
