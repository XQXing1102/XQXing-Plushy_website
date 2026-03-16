import os
import json
from datetime import datetime, timedelta
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from supabase import create_client
from flask import Flask, request, jsonify, send_from_directory

# Cloudflare Workers Python entry point
async def on_fetch(request, env):
    return await app.handle_request(request)

# Create Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY", "dev-secret-key")

# Supabase client
def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    return create_client(url, key)

# Helper functions
def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except:
        return None

def get_user_by_username(username):
    supabase = get_supabase()
    response = supabase.table("users").select("*").eq("username", username).execute()
    return response.data[0] if response.data else None

def get_user_by_id(user_id):
    supabase = get_supabase()
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    return response.data[0] if response.data else None

# Serve frontend
@app.route("/")
def home():
    return send_from_directory('frontend', 'landing.html')

# Register
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"message": "Missing fields"}), 400

    supabase = get_supabase()
    hashed_password = generate_password_hash(password)
    
    try:
        response = supabase.table("users").insert({
            "username": username,
            "email": email,
            "password": hashed_password
        }).execute()
        
        user = response.data[0]
        supabase.table("folders").insert({"user_id": user["id"], "name": "General"}).execute()
        
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"message": "Username or email already exists"}), 400

# Login
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = get_user_by_username(username)
    if user and check_password_hash(user["password"], password):
        token = jwt.encode({
            "user_id": user["id"],
            "username": user["username"],
            "exp": datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({"token": token, "message": "Login successful"}), 200
    
    return jsonify({"message": "Invalid credentials"}), 401

# Folders
@app.route("/folders", methods=["GET"])
def get_folders():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    response = supabase.table("folders").select("*").eq("user_id", user_id).execute()
    return jsonify(response.data)

@app.route("/folders", methods=["POST"])
def create_folder():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    name = request.json.get("name")
    supabase = get_supabase()
    supabase.table("folders").insert({"user_id": user_id, "name": name}).execute()
    return jsonify({"message": "Folder created"}), 201

@app.route("/folders/<int:id>", methods=["DELETE"])
def delete_folder(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    supabase.table("todos").delete().eq("folder_id", id).eq("user_id", user_id).execute()
    supabase.table("folders").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Deleted"})

# Todos
@app.route("/todos", methods=["GET"])
def get_todos():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    folder_id = request.args.get("folder_id")
    supabase = get_supabase()
    if folder_id:
        response = supabase.table("todos").select("*").eq("user_id", user_id).eq("folder_id", folder_id).execute()
    else:
        response = supabase.table("todos").select("*").eq("user_id", user_id).execute()
    return jsonify(response.data)

@app.route("/todos", methods=["POST"])
def add_todo():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    supabase = get_supabase()
    supabase.table("todos").insert({
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
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    supabase = get_supabase()
    supabase.table("todos").update(data).eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Updated"})

@app.route("/todos/<int:id>", methods=["DELETE"])
def delete_todo(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    supabase.table("todos").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Deleted"})

# Notebooks
@app.route("/notebooks", methods=["GET"])
def get_notebooks():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    response = supabase.table("notebooks").select("*").eq("user_id", user_id).execute()
    if not response.data:
        supabase.table("notebooks").insert({"user_id": user_id, "name": "My First Notebook"}).execute()
        response = supabase.table("notebooks").select("*").eq("user_id", user_id).execute()
    return jsonify(response.data)

@app.route("/notebooks", methods=["POST"])
def create_notebook():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    supabase.table("notebooks").insert({"user_id": user_id, "name": request.json.get("name")}).execute()
    return jsonify({"message": "Created"}), 201

@app.route("/notebooks/<int:id>", methods=["DELETE"])
def delete_notebook(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    supabase.table("notes").delete().eq("notebook_id", id).eq("user_id", user_id).execute()
    supabase.table("notebooks").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Deleted"})

# Notes
@app.route("/notes", methods=["GET"])
def get_notes():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    notebook_id = request.args.get("notebook_id")
    supabase = get_supabase()
    if notebook_id:
        response = supabase.table("notes").select("*").eq("user_id", user_id).eq("notebook_id", notebook_id).execute()
    else:
        response = supabase.table("notes").select("*").eq("user_id", user_id).execute()
    return jsonify(response.data)

@app.route("/notes", methods=["POST"])
def add_note():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    supabase = get_supabase()
    response = supabase.table("notes").insert({
        "user_id": user_id,
        "notebook_id": data.get("notebook_id"),
        "section": data.get("section", "General"),
        "title": data.get("title", "Untitled"),
        "content": data.get("content", "")
    }).execute()
    return jsonify({"message": "Note added", "id": response.data[0]["id"]}), 201

@app.route("/notes/<int:id>", methods=["GET"])
def get_note(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    response = supabase.table("notes").select("*").eq("id", id).eq("user_id", user_id).execute()
    if not response.data:
        return jsonify({"message": "Not found"}), 404
    return jsonify(response.data[0])

@app.route("/notes/<int:id>", methods=["PUT"])
def update_note(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    supabase = get_supabase()
    supabase.table("notes").update({
        "title": data.get("title"),
        "section": data.get("section"),
        "content": data.get("content"),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Updated"})

@app.route("/notes/<int:id>", methods=["DELETE"])
def delete_note(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    supabase.table("notes").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Deleted"})

# Files
@app.route("/files", methods=["GET"])
def get_files():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    response = supabase.table("files").select("*").eq("user_id", user_id).execute()
    return jsonify(response.data)

@app.route("/files", methods=["POST"])
def upload_file():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    supabase = get_supabase()
    response = supabase.table("files").insert({
        "user_id": user_id,
        "name": data.get("name"),
        "type": data.get("type"),
        "mime_type": data.get("mimeType"),
        "size": data.get("size", 0),
        "data": data.get("data"),
        "folder_id": data.get("folder_id")
    }).execute()
    return jsonify({"message": "File uploaded", "id": response.data[0]["id"]}), 201

@app.route("/files/<int:id>", methods=["GET"])
def get_file(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    response = supabase.table("files").select("*").eq("id", id).eq("user_id", user_id).execute()
    if not response.data:
        return jsonify({"message": "Not found"}), 404
    return jsonify(response.data[0])

@app.route("/files/<int:id>", methods=["PUT"])
def update_file(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    supabase = get_supabase()
    supabase.table("files").update({
        "name": data.get("name"),
        "folder_id": data.get("folder_id"),
        "modified_at": datetime.utcnow().isoformat()
    }).eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Updated"})

@app.route("/files/<int:id>", methods=["DELETE"])
def delete_file(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    supabase.table("files").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Deleted"})

# File Folders
@app.route("/file-folders", methods=["GET"])
def get_file_folders():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    response = supabase.table("file_folders").select("*").eq("user_id", user_id).execute()
    return jsonify(response.data)

@app.route("/file-folders", methods=["POST"])
def create_file_folder():
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    supabase = get_supabase()
    supabase.table("file_folders").insert({
        "user_id": user_id,
        "name": data.get("name"),
        "parent_id": data.get("parent_id")
    }).execute()
    return jsonify({"message": "Folder created"}), 201

@app.route("/file-folders/<int:id>", methods=["DELETE"])
def delete_file_folder(id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    supabase = get_supabase()
    supabase.table("files").delete().eq("folder_id", id).eq("user_id", user_id).execute()
    supabase.table("file_folders").delete().eq("id", id).eq("user_id", user_id).execute()
    return jsonify({"message": "Folder deleted"})

# Import note to files
@app.route("/files/import-note/<int:note_id>", methods=["POST"])
def import_note_to_files(note_id):
    user_id = verify_token(request.headers.get("Authorization", "").replace("Bearer ", ""))
    if not user_id: return jsonify({"message": "Unauthorized"}), 401

    import base64
    supabase = get_supabase()
    response = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", user_id).execute()
    if not response.data:
        return jsonify({"message": "Note not found"}), 404
    
    note = response.data[0]
    content = note["content"] or ""
    encoded = base64.b64encode(content.encode()).decode()
    
    supabase.table("files").insert({
        "user_id": user_id,
        "name": f"{note['title']}.txt",
        "type": "note",
        "mime_type": "text/plain",
        "size": len(content),
        "data": encoded
    }).execute()
    return jsonify({"message": "Imported"}), 201

# Serve static files
@app.route("/<path:filename>")
def serve_static(filename):
    try:
        return send_from_directory('frontend', filename)
    except:
        return jsonify({"message": "Not found"}), 404

# Add request handling for Cloudflare Workers
class CloudflareRequest:
    def __init__(self, cf_request):
        self.cf_request = cf_request
        self.method = cf_request.method
        self.path = cf_request.url.split('?')[0]
        self.query_string = cf_request.url.split('?')[1] if '?' in cf_request.url else ''
        self.headers = dict(cf_request.headers)
        self.json = cf_request.json if cf_request.method in ['POST', 'PUT'] else {}
        
    def args(self):
        from urllib.parse import parse_qs
        return parse_qs(self.query_string)

# Flask handle_request override for Cloudflare
def handle_request(self, request):
    # Convert Cloudflare request to Flask
    from flask import Flask
    with self.test_request_context(
        path=request.path,
        method=request.method,
        headers=dict(request.headers),
        json=request.json
    ):
        return self.full_dispatch()

# Monkey patch
app.handle_request = handle_request

# Entry point for Cloudflare Workers
def on_fetch(request, env):
    # Set environment variables
    for key, value in env.items():
        os.environ[key] = value
    
    return app.handle_request(request)
