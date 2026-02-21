from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
import smtplib

# Load .env from backend folder so SMTP_* variables are available
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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
    CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        folder_id INTEGER,
        title TEXT,
        priority TEXT,
        due_date TEXT,
        due_time TEXT DEFAULT '23:59',
        completed INTEGER DEFAULT 0,
        reminder_sent INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (folder_id) REFERENCES folders(id)
    )
    """)
    
    # Add due_time column if it doesn't exist (for existing databases)
    try:
        conn.execute("ALTER TABLE todos ADD COLUMN due_time TEXT DEFAULT '23:59'")
        conn.commit()
    except:
        pass  # Column already exists

    # Add reminder_sent column for email reminders (avoid duplicate emails)
    try:
        conn.execute("ALTER TABLE todos ADD COLUMN reminder_sent INTEGER DEFAULT 0")
        conn.commit()
    except:
        pass  # Column already exists
    
    conn.commit()
    conn.close()

init_db()

# ===== EMAIL REMINDER (SMTP) =====
# Set these in environment (or .env with python-dotenv) when you have SMTP details:
#   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASSWORD,
#   SMTP_FROM_EMAIL (optional, defaults to SMTP_USER), SMTP_USE_TLS (default 1).
# Reminders are sent ~1 hour before each task's due date/time to the user's email.
def get_smtp_config():
    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
    except (TypeError, ValueError):
        port = 587
    return {
        "host": (os.environ.get("SMTP_HOST") or "").strip(),
        "port": port,
        "user": (os.environ.get("SMTP_USER") or "").strip(),
        "password": (os.environ.get("SMTP_PASSWORD") or "").strip(),
        "from_email": (os.environ.get("SMTP_FROM_EMAIL") or os.environ.get("SMTP_USER") or "").strip(),
        "use_tls": (os.environ.get("SMTP_USE_TLS") or "1").strip().lower() in ("1", "true", "yes"),
    }

def send_reminder_email(to_email, task_title, due_datetime_str):
    """Send a single reminder email. Returns True on success."""
    cfg = get_smtp_config()
    if not cfg["host"] or not cfg["user"] or not cfg["password"]:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Reminder: Task due soon — {task_title}"
        msg["From"] = cfg["from_email"]
        msg["To"] = to_email
        text = f"Your task \"{task_title}\" is due in about 1 hour.\n\nDue: {due_datetime_str}\n\n— XQXing-Plushy Todo"
        msg.attach(MIMEText(text, "plain"))
        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            if cfg["use_tls"]:
                server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from_email"], to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"SMTP error sending to {to_email}: {e}")
        return False

def check_and_send_reminders():
    """Find tasks due within the next hour, send email to user, mark reminder_sent=1."""
    cfg = get_smtp_config()
    if not cfg["host"] or not cfg["user"]:
        return
    now = datetime.now()
    window_end = now + timedelta(hours=1)
    conn = get_db()
    try:
        todos = conn.execute(
            """SELECT t.id, t.user_id, t.title, t.due_date, t.due_time
               FROM todos t
               WHERE t.due_date IS NOT NULL AND t.due_date != ''
                 AND t.completed = 0 AND (t.reminder_sent IS NULL OR t.reminder_sent = 0)"""
        ).fetchall()
        sent = 0
        for row in todos:
            due_date = (row["due_date"] or "").strip()
            due_time = (row["due_time"] or "23:59").strip()
            if len(due_time) == 5 and ":" in due_time:
                pass
            else:
                due_time = "23:59"
            if not due_date:
                continue
            try:
                due_dt = datetime.strptime(f"{due_date} {due_time}", "%Y-%m-%d %H:%M")
            except ValueError as e:
                print(f"[Reminder] Skip task id={row['id']}: invalid date/time '{due_date} {due_time}' -> {e}")
                continue
            if now <= due_dt <= window_end:
                # Use the same email stored at registration (users.email)
                user = conn.execute("SELECT username, email FROM users WHERE id=?", (row["user_id"],)).fetchone()
                to_email = (user["email"] or "").strip() if user and "email" in user.keys() else ""
                if not user or not to_email:
                    print(f"[Reminder] Skip task id={row['id']} (user_id={row['user_id']}): no email for this user (use registered email).")
                    continue
                due_str = due_dt.strftime("%Y-%m-%d %H:%M")
                print(f"[Reminder] Sending to {to_email} for task \"{row['title']}\" due {due_str}")
                if send_reminder_email(to_email, row["title"], due_str):
                    conn.execute("UPDATE todos SET reminder_sent=1 WHERE id=?", (row["id"],))
                    conn.commit()
                    sent += 1
                    print(f"[Reminder] Sent OK for task id={row['id']}")
                else:
                    print(f"[Reminder] Failed to send for task id={row['id']}")
        if sent or todos:
            print(f"[Reminder] Check done: {len(todos)} candidate(s), {sent} email(s) sent. Now={now.strftime('%Y-%m-%d %H:%M')}, window_end={window_end.strftime('%Y-%m-%d %H:%M')}")
    except Exception as e:
        print(f"[Reminder] Error: {e}")
    finally:
        conn.close()

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

# Register endpoint – email is required and used for task reminder notifications
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password")

    if not username:
        return jsonify({"message": "Username required"}), 400
    if not email:
        return jsonify({"message": "Email required"}), 400
    if "@" not in email:
        return jsonify({"message": "Enter a valid email address"}), 400
    if not password:
        return jsonify({"message": "Password required"}), 400

    try:
        conn = get_db()
        hashed_password = generate_password_hash(password)
        cursor = conn.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (username, email, hashed_password)
        )
        conn.commit()
        
        # Get the newly created user_id
        user_id = cursor.lastrowid
        
        # Create default "General" folder for new user
        conn.execute(
            "INSERT INTO folders (user_id, name) VALUES (?, ?)",
            (user_id, "General")
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

    folder_id = request.args.get("folder_id")
    conn = get_db()
    
    if folder_id:
        todos = conn.execute(
            "SELECT * FROM todos WHERE user_id=? AND folder_id=? ORDER BY id DESC", 
            (user_id, folder_id)
        ).fetchall()
    else:
        todos = conn.execute(
            "SELECT * FROM todos WHERE user_id=? ORDER BY id DESC", 
            (user_id,)
        ).fetchall()
    
    conn.close()
    return jsonify([dict(row) for row in todos])

@app.route("/todos", methods=["POST"])
def add_todo():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    
    # Validate required fields
    if not data.get("title") or not data.get("priority"):
        return jsonify({"message": "Missing title or priority"}), 400
    
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO todos (user_id, folder_id, title, priority, due_date, due_time) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, data.get("folder_id"), data["title"], data["priority"], data.get("due_date", ""), data.get("due_time", "23:59"))
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Task added"}), 201
    except Exception as e:
        return jsonify({"message": f"Error adding task: {str(e)}"}), 500

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
    due_time = data.get("due_time") if data.get("due_time") else todo["due_time"]
    completed = data.get("completed")
    # Reset reminder_sent when due date/time changes so user gets a new reminder
    reset_reminder = data.get("due_date") is not None or data.get("due_time") is not None
    reminder_sent = 0 if reset_reminder else (todo["reminder_sent"] if "reminder_sent" in todo.keys() else 0)

    conn.execute("""
        UPDATE todos 
        SET title=?, priority=?, due_date=?, due_time=?, completed=?, reminder_sent=? 
        WHERE id=? AND user_id=?
    """, (title, priority, due_date, due_time, completed, reminder_sent, id, user_id))

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

# ===== FOLDER ENDPOINTS =====
# Get all folders for user
@app.route("/folders", methods=["GET"])
def get_folders():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    conn = get_db()
    folders = conn.execute(
        "SELECT * FROM folders WHERE user_id=? ORDER BY created_at DESC", 
        (user_id,)
    ).fetchall()
    
    # If user has no folders, create default "General" folder
    if not folders:
        conn.execute(
            "INSERT INTO folders (user_id, name) VALUES (?, ?)",
            (user_id, "General")
        )
        conn.commit()
        folders = conn.execute(
            "SELECT * FROM folders WHERE user_id=? ORDER BY created_at DESC", 
            (user_id,)
        ).fetchall()
    
    conn.close()
    return jsonify([dict(row) for row in folders])

# Create new folder
@app.route("/folders", methods=["POST"])
def create_folder():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    name = data.get("name")

    if not name:
        return jsonify({"message": "Missing folder name"}), 400

    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO folders (user_id, name) VALUES (?, ?)",
            (user_id, name)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Folder created"}), 201
    except Exception as e:
        return jsonify({"message": f"Error creating folder: {str(e)}"}), 500

# Update/Rename folder
@app.route("/folders/<int:id>", methods=["PUT"])
def update_folder(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    name = data.get("name")

    if not name:
        return jsonify({"message": "Missing folder name"}), 400

    conn = get_db()
    # Check if folder belongs to user
    folder = conn.execute(
        "SELECT * FROM folders WHERE id=? AND user_id=?", 
        (id, user_id)
    ).fetchone()
    
    if not folder:
        conn.close()
        return jsonify({"message": "Folder not found"}), 404

    conn.execute(
        "UPDATE folders SET name=? WHERE id=? AND user_id=?",
        (name, id, user_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Folder updated"})

# Check if SMTP is configured (for debugging; does not expose secrets).
@app.route("/smtp-status", methods=["GET"])
def smtp_status():
    cfg = get_smtp_config()
    ok = bool(cfg["host"] and cfg["user"] and cfg["password"])
    return jsonify({"smtp_configured": ok, "host_set": bool(cfg["host"])}), 200

# Trigger email reminders check (1 hour before deadline). Call via cron or use built-in scheduler.
@app.route("/check-reminders", methods=["GET", "POST"])
def trigger_check_reminders():
    check_and_send_reminders()
    return jsonify({"message": "Reminder check completed"}), 200

# Delete folder
@app.route("/folders/<int:id>", methods=["DELETE"])
def delete_folder(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    conn = get_db()
    # Check if folder belongs to user
    folder = conn.execute(
        "SELECT * FROM folders WHERE id=? AND user_id=?", 
        (id, user_id)
    ).fetchone()
    
    if not folder:
        conn.close()
        return jsonify({"message": "Folder not found"}), 404

    # Delete all todos in this folder
    conn.execute("DELETE FROM todos WHERE folder_id=? AND user_id=?", (id, user_id))
    # Delete the folder itself
    conn.execute("DELETE FROM folders WHERE id=? AND user_id=?", (id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Folder deleted"})

# Serve frontend static files (must be AFTER all API routes)
@app.route("/<path:filename>")
def serve_static(filename):
    try:
        return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'frontend'), filename)
    except:
        return jsonify({"message": "File not found"}), 404

# Run reminder check when SMTP is configured
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(check_and_send_reminders, "interval", minutes=2, id="reminder_check")
_cfg = get_smtp_config()
if _cfg["host"] and _cfg["user"]:
    scheduler.start()
    print("[Reminder] Scheduler started (every 2 min). Running first check now.")
    check_and_send_reminders()

if __name__ == "__main__":
    app.run(debug=True, port=9999) 
