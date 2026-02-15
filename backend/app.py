from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

def get_db():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        priority TEXT,
        due_date TEXT,
        completed INTEGER DEFAULT 0
    )
    """)
    conn.commit()
    conn.close()

init_db()

@app.route("/todos", methods=["GET"])
def get_todos():
    conn = get_db()
    todos = conn.execute("SELECT * FROM todos ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(row) for row in todos])

@app.route("/todos", methods=["POST"])
def add_todo():
    data = request.json
    conn = get_db()
    conn.execute(
        "INSERT INTO todos (title, priority, due_date) VALUES (?, ?, ?)",
        (data["title"], data["priority"], data["due_date"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Task added"})

@app.route("/todos/<int:id>", methods=["PUT"])
def update_todo(id):
    data = request.json
    conn = get_db()

    # get old values if blank update request
    old = conn.execute("SELECT * FROM todos WHERE id=?", (id,)).fetchone()

    title = data.get("title") if data.get("title") else old["title"]
    priority = data.get("priority") if data.get("priority") else old["priority"]
    due_date = data.get("due_date") if data.get("due_date") else old["due_date"]
    completed = data.get("completed")

    conn.execute("""
        UPDATE todos 
        SET title=?, priority=?, due_date=?, completed=? 
        WHERE id=?
    """, (title, priority, due_date, completed, id))

    conn.commit()
    conn.close()
    return jsonify({"message": "Updated"})

# Delete task
@app.route("/todos/<int:id>", methods=["DELETE"])
def delete_todo(id):
    conn = get_db()
    conn.execute("DELETE FROM todos WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"})

if __name__ == "__main__":
    app.run(debug=True)
