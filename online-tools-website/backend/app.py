from flask import Flask
from flask_cors import CORS
from backend.routes.todo_routes import todo_routes

app = Flask(__name__)
CORS(app)

app.config.from_object('backend.config.Config')

app.register_blueprint(todo_routes)

if __name__ == '__main__':
    app.run(debug=True)