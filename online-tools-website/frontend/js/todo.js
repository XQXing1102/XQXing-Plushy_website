// frontend/js/todo.js

document.addEventListener('DOMContentLoaded', function() {
    const taskList = document.getElementById('task-list');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const dueDateInput = document.getElementById('due-date-input');
    const priorityInput = document.getElementById('priority-input');

    taskForm.addEventListener('submit', function(event) {
        event.preventDefault();
        addTask();
    });

    function addTask() {
        const taskTitle = taskInput.value;
        const dueDate = dueDateInput.value;
        const priority = priorityInput.value;

        if (taskTitle) {
            const task = {
                title: taskTitle,
                dueDate: dueDate,
                priority: priority,
                completed: false
            };

            // Call backend API to save the task
            fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(task)
            })
            .then(response => response.json())
            .then(data => {
                displayTask(data);
                clearForm();
            })
            .catch(error => console.error('Error:', error));
        }
    }

    function displayTask(task) {
        const taskItem = document.createElement('li');
        taskItem.textContent = `${task.title} - Due: ${task.dueDate} - Priority: ${task.priority}`;
        taskItem.setAttribute('data-id', task.id);
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteTask(task.id));

        taskItem.appendChild(deleteButton);
        taskList.appendChild(taskItem);
    }

    function deleteTask(taskId) {
        fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        })
        .then(() => {
            const taskItem = document.querySelector(`li[data-id='${taskId}']`);
            taskList.removeChild(taskItem);
        })
        .catch(error => console.error('Error:', error));
    }

    function clearForm() {
        taskInput.value = '';
        dueDateInput.value = '';
        priorityInput.value = '';
    }

    // Load existing tasks on page load
    function loadTasks() {
        fetch('/api/tasks')
        .then(response => response.json())
        .then(tasks => {
            tasks.forEach(task => displayTask(task));
        })
        .catch(error => console.error('Error:', error));
    }

    loadTasks();
});