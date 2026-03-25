import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import smtplib

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from supabase import create_client, Client

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": os.environ.get("CORS_ORIGINS", "*")}})
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")

# Supabase client
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    return create_client(url, key)

supabase = get_supabase()

# ===== HELPER FUNCTIONS =====
def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_user_by_username(username):
    response = supabase.table("users").select("*").eq("username", username).execute()
    return response.data[0] if response.data else None

def get_user_by_id(user_id):
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    return response.data[0] if response.data else None

def create_user(username, email, password):
    hashed_password = generate_password_hash(password)
    response = supabase.table("users").insert({
        "username": username,
        "email": email,
        "password": hashed_password
    }).execute()
    return response.data[0] if response.data else None

# Serve landing page
@app.route("/", methods=["GET"])
def home():
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'frontend'), 'landing.html')

# Register endpoint
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
        user = create_user(username, email, password)
        if not user:
            return jsonify({"message": "Username or email already exists"}), 400
        
        # Create default folder
        supabase.table("folders").insert({"user_id": user["id"], "name": "General"}).execute()
        
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        if "duplicate" in str(e).lower():
            return jsonify({"message": "Username or email already exists"}), 400
        return jsonify({"message": str(e)}), 500

# Login endpoint
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    user = get_user_by_username(username)

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

# ===== FOLDERS =====
@app.route("/folders", methods=["GET"])
def get_folders():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    response = supabase.table("folders").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    folders = response.data
    
    if not folders:
        supabase.table("folders").insert({"user_id": user_id, "name": "General"}).execute()
        response = supabase.table("folders").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        folders = response.data
    
    return jsonify(folders)

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

    response = supabase.table("folders").insert({"user_id": user_id, "name": name}).execute()
    return jsonify({"message": "Folder created"}), 201

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

    supabase.table("folders").update({"name": name}).eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Folder updated"})

@app.route("/folders/<int:id>", methods=["DELETE"])
def delete_folder(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    supabase.table("todos").delete().eq("folder_id", id).eq("user_id", user_id).execute()
    supabase.table("folders").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Folder deleted"})

# ===== TODOS =====
@app.route("/todos", methods=["GET"])
def get_todos():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    folder_id = request.args.get("folder_id")
    if folder_id:
        response = supabase.table("todos").select("*").eq("user_id", user_id).eq("folder_id", folder_id).order("id", desc=True).execute()
    else:
        response = supabase.table("todos").select("*").eq("user_id", user_id).order("id", desc=True).execute()
    
    return jsonify(response.data)

@app.route("/todos", methods=["POST"])
def add_todo():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    if not data.get("title") or not data.get("priority"):
        return jsonify({"message": "Missing title or priority"}), 400

    response = supabase.table("todos").insert({
        "user_id": user_id,
        "folder_id": data.get("folder_id"),
        "title": data["title"],
        "priority": data["priority"],
        "due_date": data.get("due_date", ""),
        "due_time": data.get("due_time", "23:59")
    }).execute()
    
    return jsonify({"message": "Task added"}), 201

@app.route("/todos/<int:id>", methods=["PUT"])
def update_todo(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    
    # Get current todo
    response = supabase.table("todos").select("*").eq("id", id).eq("user_id", user_id).execute()
    if not response.data:
        return jsonify({"message": "Todo not found"}), 404
    
    todo = response.data[0]
    
    title = data.get("title") if data.get("title") is not None else todo["title"]
    priority = data.get("priority") if data.get("priority") is not None else todo["priority"]
    due_date = data.get("due_date") if data.get("due_date") is not None else todo["due_date"]
    due_time = data.get("due_time") if data.get("due_time") is not None else todo["due_time"]
    completed = data.get("completed") if data.get("completed") is not None else todo["completed"]
    
    reset_reminder = (data.get("due_date") is not None and data.get("due_date") != todo["due_date"]) or (data.get("due_time") is not None and data.get("due_time") != todo["due_time"])
    reminder_sent = 0 if reset_reminder else (todo.get("reminder_sent") or 0)

    supabase.table("todos").update({
        "title": title,
        "priority": priority,
        "due_date": due_date,
        "due_time": due_time,
        "completed": completed,
        "reminder_sent": reminder_sent
    }).eq("id", id).eq("user_id", user_id).execute()
    
    return jsonify({"message": "Updated"})

@app.route("/todos/<int:id>", methods=["DELETE"])
def delete_todo(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    supabase.table("todos").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Deleted"})

# ===== NOTES & NOTEBOOKS =====
@app.route("/notebooks", methods=["GET"])
def get_notebooks():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    response = supabase.table("notebooks").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    notebooks = response.data
    
    if not notebooks:
        supabase.table("notebooks").insert({"user_id": user_id, "name": "My First Notebook"}).execute()
        response = supabase.table("notebooks").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        notebooks = response.data
    
    return jsonify(notebooks)

@app.route("/notebooks", methods=["POST"])
def create_notebook():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    name = data.get("name")
    if not name:
        return jsonify({"message": "Missing notebook name"}), 400

    supabase.table("notebooks").insert({"user_id": user_id, "name": name}).execute()
    return jsonify({"message": "Notebook created"}), 201

@app.route("/notebooks/<int:id>", methods=["DELETE"])
def delete_notebook(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    supabase.table("notes").delete().eq("notebook_id", id).eq("user_id", user_id).execute()
    supabase.table("notebooks").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Notebook deleted"})

@app.route("/notes", methods=["GET"])
def get_notes():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    notebook_id = request.args.get("notebook_id")
    if notebook_id:
        response = supabase.table("notes").select("*").eq("user_id", user_id).eq("notebook_id", notebook_id).order("updated_at", desc=True).execute()
    else:
        response = supabase.table("notes").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
    
    return jsonify(response.data)

@app.route("/notes", methods=["POST"])
def add_note():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    notebook_id = data.get("notebook_id")
    title = data.get("title", "Untitled")
    section = data.get("section", "General")
    content = data.get("content", "")

    if not notebook_id:
        return jsonify({"message": "Missing notebook ID"}), 400

    response = supabase.table("notes").insert({
        "user_id": user_id,
        "notebook_id": notebook_id,
        "section": section,
        "title": title,
        "content": content
    }).execute()
    
    return jsonify({"message": "Note added", "id": response.data[0]["id"] if response.data else None}), 201

@app.route("/notes/<int:id>", methods=["GET"])
def get_note(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    response = supabase.table("notes").select("*").eq("id", id).eq("user_id", user_id).execute()
    if not response.data:
        return jsonify({"message": "Note not found"}), 404
    return jsonify(response.data[0])

@app.route("/notes/<int:id>", methods=["PUT"])
def update_note(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    
    response = supabase.table("notes").select("*").eq("id", id).eq("user_id", user_id).execute()
    if not response.data:
        return jsonify({"message": "Note not found"}), 404
    
    note = response.data[0]
    title = data.get("title") if data.get("title") is not None else note["title"]
    section = data.get("section") if data.get("section") is not None else note["section"]
    content = data.get("content") if data.get("content") is not None else note["content"]

    supabase.table("notes").update({
        "title": title,
        "section": section,
        "content": content,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", id).eq("user_id", user_id).execute()
    
    return jsonify({"message": "Updated"})

@app.route("/notes/<int:id>", methods=["DELETE"])
def delete_note(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    supabase.table("notes").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Deleted"})

# ===== FILES (Google Drive-like) =====
@app.route("/files", methods=["GET"])
def get_files():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    folder_id = request.args.get("folder_id")
    file_type = request.args.get("type")
    
    query = supabase.table("files").select("*").eq("user_id", user_id)
    
    if folder_id:
        query = query.eq("folder_id", folder_id)
    if file_type:
        query = query.eq("type", file_type)
    
    response = query.order("modified_at", desc=True).execute()
    return jsonify(response.data)

@app.route("/files", methods=["POST"])
def upload_file():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    name = data.get("name")
    file_type = data.get("type")
    mime_type = data.get("mimeType")
    size = data.get("size", 0)
    file_data = data.get("data")
    folder_id = data.get("folder_id")

    if not name:
        return jsonify({"message": "Missing file name"}), 400

    response = supabase.table("files").insert({
        "user_id": user_id,
        "name": name,
        "type": file_type,
        "mime_type": mime_type,
        "size": size,
        "data": file_data,
        "folder_id": folder_id
    }).execute()
    
    return jsonify({"message": "File uploaded", "id": response.data[0]["id"] if response.data else None}), 201

@app.route("/files/<int:id>", methods=["GET"])
def get_file(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    response = supabase.table("files").select("*").eq("id", id).eq("user_id", user_id).execute()
    if not response.data:
        return jsonify({"message": "File not found"}), 404
    return jsonify(response.data[0])

@app.route("/files/<int:id>", methods=["PUT"])
def update_file(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    
    response = supabase.table("files").select("*").eq("id", id).eq("user_id", user_id).execute()
    if not response.data:
        return jsonify({"message": "File not found"}), 404

    name = data.get("name") if data.get("name") is not None else response.data[0]["name"]
    folder_id = data.get("folder_id") if data.get("folder_id") is not None else response.data[0]["folder_id"]

    supabase.table("files").update({
        "name": name,
        "folder_id": folder_id,
        "modified_at": datetime.utcnow().isoformat()
    }).eq("id", id).eq("user_id", user_id).execute()
    
    return jsonify({"message": "Updated"})

@app.route("/files/<int:id>", methods=["DELETE"])
def delete_file(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    supabase.table("files").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Deleted"})

# File Folders API
@app.route("/file-folders", methods=["GET"])
def get_file_folders():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    parent_id = request.args.get("parent_id")
    
    if parent_id:
        response = supabase.table("file_folders").select("*").eq("user_id", user_id).eq("parent_id", parent_id).order("name").execute()
    else:
        response = supabase.table("file_folders").select("*").eq("user_id", user_id).order("name").execute()
    
    return jsonify(response.data)

@app.route("/file-folders", methods=["POST"])
def create_file_folder():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    name = data.get("name")
    parent_id = data.get("parent_id")

    if not name:
        return jsonify({"message": "Missing folder name"}), 400

    response = supabase.table("file_folders").insert({
        "user_id": user_id,
        "name": name,
        "parent_id": parent_id
    }).execute()
    
    return jsonify({"message": "Folder created", "id": response.data[0]["id"] if response.data else None}), 201

@app.route("/file-folders/<int:id>", methods=["DELETE"])
def delete_file_folder(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    # Get subfolders
    response = supabase.table("file_folders").select("id").eq("parent_id", id).eq("user_id", user_id).execute()
    for sub in response.data:
        supabase.table("files").delete().eq("folder_id", sub["id"]).eq("user_id", user_id).execute()
        supabase.table("file_folders").delete().eq("id", sub["id"]).eq("user_id", user_id).execute()
    
    supabase.table("files").delete().eq("folder_id", id).eq("user_id", user_id).execute()
    supabase.table("file_folders").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Folder deleted"})

# Import notes to files
@app.route("/files/import-note/<int:note_id>", methods=["POST"])
def import_note_to_files(note_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    response = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", user_id).execute()
    if not response.data:
        return jsonify({"message": "Note not found"}), 404

    note = response.data[0]
    import base64
    content = note["content"] or ""
    encoded = base64.b64encode(content.encode()).decode()
    
    file_response = supabase.table("files").insert({
        "user_id": user_id,
        "name": f"{note['title']}.txt",
        "type": "note",
        "mime_type": "text/plain",
        "size": len(content),
        "data": encoded
    }).execute()
    
    return jsonify({"message": "Note imported to files", "id": file_response.data[0]["id"] if file_response.data else None}), 201

# ===== URL SHORTENER =====
@app.route("/short-urls", methods=["GET"])
def get_short_urls():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    response = supabase.table("short_urls").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return jsonify(response.data)

@app.route("/short-urls", methods=["POST"])
def create_short_url():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    original_url = data.get("original_url")
    alias = data.get("alias")
    title = data.get("title", "Untitled")

    if not original_url:
        return jsonify({"message": "Missing original URL"}), 400
    
    if not alias:
        return jsonify({"message": "Missing alias"}), 400

    # Check if alias already exists for this user
    existing = supabase.table("short_urls").select("*").eq("alias", alias).execute()
    if existing.data:
        return jsonify({"message": "Alias already exists. Please choose another."}), 400

    # Create short URL
    base_url = request.host_url.rstrip('/')
    short_url = f"{base_url}/s/{alias}"

    response = supabase.table("short_urls").insert({
        "user_id": user_id,
        "original_url": original_url,
        "alias": alias,
        "short_url": short_url,
        "title": title,
        "clicks": 0
    }).execute()
    
    return jsonify({"message": "Short URL created", "short_url": short_url, "id": response.data[0]["id"] if response.data else None}), 201

@app.route("/short-urls/<int:id>", methods=["DELETE"])
def delete_short_url(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    supabase.table("short_urls").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Deleted"})

# Redirect short URL
@app.route("/s/<alias>", methods=["GET"])
def redirect_short_url(alias):
    response = supabase.table("short_urls").select("*").eq("alias", alias).execute()
    
    if not response.data:
        return jsonify({"message": "Short URL not found"}), 404
    
    url_data = response.data[0]
    
    # Increment click count
    new_clicks = (url_data.get("clicks") or 0) + 1
    supabase.table("short_urls").update({"clicks": new_clicks}).eq("alias", alias).execute()
    
    # Redirect to original URL
    from flask import redirect
    return redirect(url_data["original_url"], code=302)

# ===== EMAIL REMINDER (SMTP) =====
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
    cfg = get_smtp_config()
    if not cfg["host"] or not cfg["user"] or not cfg["password"]:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Reminder: Task due soon — {task_title}"
        msg["From"] = str(cfg["from_email"])
        msg["To"] = str(to_email)
        text = f"Your task \"{task_title}\" is due in about 1 hour.\n\nDue: {due_datetime_str}\n\n— XQXing-Plushy Todo"
        msg.attach(MIMEText(text, "plain"))
        with smtplib.SMTP(str(cfg["host"]), int(cfg["port"])) as server:
            if cfg["use_tls"]:
                server.starttls()
            server.login(str(cfg["user"]), str(cfg["password"]))
            server.sendmail(str(cfg["from_email"]), to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"SMTP error sending to {to_email}: {e}")
        return False

def check_and_send_reminders():
    cfg = get_smtp_config()
    if not cfg["host"] or not cfg["user"]:
        return
    now = datetime.now()
    window_end = now + timedelta(hours=1)
    
    response = supabase.table("todos").select("*").execute()
    todos = [t for t in response.data if t.get("due_date") and not t.get("completed")]
    
    sent_count = 0
    for row in todos:
        due_date = (row.get("due_date") or "").strip()
        due_time = (row.get("due_time") or "23:59").strip()
        if len(due_time) == 5 and ":" in due_time:
            pass
        else:
            due_time = "23:59"
        if not due_date:
            continue
        try:
            due_dt = datetime.strptime(f"{due_date} {due_time}", "%Y-%m-%d %H:%M")
        except ValueError:
            continue
        if now <= due_dt <= window_end:
            user = get_user_by_id(row["user_id"])
            to_email = (user.get("email") or "").strip() if user else ""
            if not user or not to_email:
                continue
            due_str = due_dt.strftime("%Y-%m-%d %H:%M")
            if send_reminder_email(to_email, row["title"], due_str):
                supabase.table("todos").update({"reminder_sent": 1}).eq("id", row["id"]).execute()
                sent_count += 1
    
    print(f"[Reminder] Check done: {len(todos)} task(s) checked, {sent_count} email(s) sent")

@app.route("/check-reminders", methods=["GET", "POST"])
def trigger_check_reminders():
    check_and_send_reminders()
    return jsonify({"message": "Reminder check completed"}), 200

@app.route("/smtp-status", methods=["GET"])
def smtp_status():
    cfg = get_smtp_config()
    ok = bool(cfg["host"] and cfg["user"] and cfg["password"])
    return jsonify({"smtp_configured": ok, "host_set": bool(cfg["host"])}), 200

# Serve frontend static files
@app.route("/<path:filename>")
def serve_static(filename):
    try:
        return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'frontend'), filename)
    except:
        return jsonify({"message": "File not found"}), 404

if __name__ == "__main__":
    app.run(debug=True, port=9999)
