from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config['SECRET_KEY'] = 'XQXing&piyushzu'

def get_db():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT,
        priority TEXT,
        due_date TEXT,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)
    conn.commit()
    conn.close()

init_db()

# Serve landing page
@app.route("/", methods=["GET"])
def home():
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'frontend'), 'landing.html')

# Helper function to verify JWT token and get user_id
def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Register endpoint
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"message": "Missing required fields"}), 400

    try:
        conn = get_db()
        hashed_password = generate_password_hash(password)
        conn.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (username, email, hashed_password)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"message": "Username or email already exists"}), 400

# Login endpoint
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    conn.close()

    if user and check_password_hash(user["password"], password):
        token = jwt.encode(
            {
                "user_id": user["id"],
                "username": user["username"],
                "exp": datetime.utcnow() + timedelta(days=7)
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        return jsonify({"token": token, "message": "Login successful"}), 200
    else:
        return jsonify({"message": "Invalid username or password"}), 401

@app.route("/todos", methods=["GET"])
def get_todos():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    conn = get_db()
    todos = conn.execute("SELECT * FROM todos WHERE user_id=? ORDER BY id DESC", (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in todos])

@app.route("/todos", methods=["POST"])
def add_todo():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    conn = get_db()
    conn.execute(
        "INSERT INTO todos (user_id, title, priority, due_date) VALUES (?, ?, ?, ?)",
        (user_id, data["title"], data["priority"], data["due_date"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Task added"})

@app.route("/todos/<int:id>", methods=["PUT"])
def update_todo(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    conn = get_db()

    # Check if todo belongs to user
    todo = conn.execute("SELECT * FROM todos WHERE id=? AND user_id=?", (id, user_id)).fetchone()
    if not todo:
        conn.close()
        return jsonify({"message": "Todo not found"}), 404

    # get old values if blank update request
    title = data.get("title") if data.get("title") else todo["title"]
    priority = data.get("priority") if data.get("priority") else todo["priority"]
    due_date = data.get("due_date") if data.get("due_date") else todo["due_date"]
    completed = data.get("completed")

    conn.execute("""
        UPDATE todos 
        SET title=?, priority=?, due_date=?, completed=? 
        WHERE id=? AND user_id=?
    """, (title, priority, due_date, completed, id, user_id))

    conn.commit()
    conn.close()
    return jsonify({"message": "Updated"})

# Delete task
@app.route("/todos/<int:id>", methods=["DELETE"])
def delete_todo(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    conn = get_db()
    # Check if todo belongs to user
    todo = conn.execute("SELECT * FROM todos WHERE id=? AND user_id=?", (id, user_id)).fetchone()
    if not todo:
        conn.close()
        return jsonify({"message": "Todo not found"}), 404

    conn.execute("DELETE FROM todos WHERE id=? AND user_id=?", (id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"})

# Serve frontend static files (must be AFTER all API routes)
@app.route("/<path:filename>")
def serve_static(filename):
    try:
        return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'frontend'), filename)
    except:
        return jsonify({"message": "File not found"}), 404

if __name__ == "__main__":
    app.run(debug=True,port=9999) 
