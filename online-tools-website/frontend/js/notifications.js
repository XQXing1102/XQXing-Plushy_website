// This file manages notifications for task reminders and updates, providing user feedback for actions taken on tasks.

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerText = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function notifyTaskAdded(task) {
    showNotification(`Task "${task.title}" has been added successfully!`);
}

function notifyTaskUpdated(task) {
    showNotification(`Task "${task.title}" has been updated successfully!`);
}

function notifyTaskDeleted(task) {
    showNotification(`Task "${task.title}" has been deleted successfully!`);
}

function notifyTaskDue(task) {
    showNotification(`Reminder: Task "${task.title}" is due soon!`);
}