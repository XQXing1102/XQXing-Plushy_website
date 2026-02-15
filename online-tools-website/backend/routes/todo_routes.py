from flask import Blueprint, request, jsonify
from ..controllers.todo_controller import TodoController

todo_routes = Blueprint('todo_routes', __name__)

@todo_routes.route('/tasks', methods=['GET'])
def get_tasks():
    return jsonify(TodoController.get_all_tasks())

@todo_routes.route('/tasks', methods=['POST'])
def create_task():
    data = request.json
    task = TodoController.create_task(data)
    return jsonify(task), 201

@todo_routes.route('/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    task = TodoController.get_task(task_id)
    if task:
        return jsonify(task)
    return jsonify({'error': 'Task not found'}), 404

@todo_routes.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    updated_task = TodoController.update_task(task_id, data)
    if updated_task:
        return jsonify(updated_task)
    return jsonify({'error': 'Task not found'}), 404

@todo_routes.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    success = TodoController.delete_task(task_id)
    if success:
        return jsonify({'message': 'Task deleted successfully'}), 204
    return jsonify({'error': 'Task not found'}), 404