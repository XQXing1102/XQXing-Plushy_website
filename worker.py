import os
import json
from datetime import datetime, timedelta
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
import base64

# Supabase
from supabase import create_client
from js import Response

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://vmtvzhcwsoycuzgclgdu.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdHZ6aGN3c295Y3V6Z2NsZ2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTMzMTAsImV4cCI6MjA4OTIyOTMxMH0.gk43WZnAO9ogZtQNdistLGVuGuXFspgCZ0coyyUrj8E")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def verify_token(auth_header):
    if not auth_header:
        return None
    token = auth_header.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload.get('user_id')
    except:
        return None

def json_response(data, status=200):
    return Response(
        json.dumps(data),
        status=status,
        mimetype="application/json"
    )

def get_user(username):
    response = supabase.table("users").select("*").eq("username", username).execute()
    return response.data[0] if response.data else None

def get_user_by_id(user_id):
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    return response.data[0] if response.data else None

async def on_fetch(request, env):
    path = request.path
    method = request.method
    auth = request.headers.get("Authorization", "")
    user_id = verify_token(auth)
    
    # CORS
    if method == "OPTIONS":
        return Response("", headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        })

    # Serve frontend files
    if path == "/" or path == "":
        return Response.redirect("https://xqpl-tool.pages.dev/landing.html", status=302)
    
    if path == "/landing.html":
        with open("frontend/landing.html", "r") as f:
            return Response(f.read(), mimetype="text/html")
    
    if path == "/index.html":
        with open("frontend/index.html", "r") as f:
            return Response(f.read(), mimetype="text/html")
    
    if path == "/auth/login.html":
        with open("frontend/auth/login.html", "r") as f:
            return Response(f.read(), mimetype="text/html")
    
    if path == "/auth/register.html":
        with open("frontend/auth/register.html", "r") as f:
            return Response(f.read(), mimetype="text/html")
    
    # URL Shortener - Public redirect endpoint (NO AUTH REQUIRED)
    if path.startswith("/s/") and method == "GET":
        alias = path.split("/s/")[1]
        resp = supabase.table("short_urls").select("*").eq("alias", alias).execute()
        
        if not resp.data:
            return json_response({"message": "Short URL not found"}, 404)
        
        url_data = resp.data[0]
        
        # Increment click count
        new_clicks = (url_data.get("clicks") or 0) + 1
        supabase.table("short_urls").update({"clicks": new_clicks}).eq("alias", alias).execute()
        
        # Redirect to original URL
        return Response.redirect(url_data["original_url"], status=302)
    
    # API Routes
    if path == "/register" and method == "POST":
        data = await request.json()
        username = (data.get("username") or "").strip()
        email = (data.get("email") or "").strip()
        password = data.get("password")
        
        if not username or not email or not password:
            return json_response({"message": "Missing fields"}, 400)
        
        hashed = generate_password_hash(password)
        try:
            resp = supabase.table("users").insert({
                "username": username,
                "email": email,
                "password": hashed
            }).execute()
            user = resp.data[0]
            supabase.table("folders").insert({"user_id": user["id"], "name": "General"}).execute()
            supabase.table("notebooks").insert({"user_id": user["id"], "name": "My First Notebook"}).execute()
            return json_response({"message": "User registered"}, 201)
        except:
            return json_response({"message": "Username or email exists"}, 400)
    
    if path == "/login" and method == "POST":
        data = await request.json()
        user = get_user(data.get("username", ""))
        if user and check_password_hash(user["password"], data.get("password", "")):
            token = jwt.encode({
                "user_id": user["id"],
                "username": user["username"],
                "exp": datetime.utcnow() + timedelta(days=7)
            }, SECRET_KEY, algorithm='HS256')
            return json_response({"token": token, "message": "Login successful"})
        return json_response({"message": "Invalid credentials"}, 401)
    
    # Protected routes
    if not user_id:
        return json_response({"message": "Unauthorized"}, 401)
    
    # Folders
    if path == "/folders" and method == "GET":
        resp = supabase.table("folders").select("*").eq("user_id", user_id).execute()
        return json_response(resp.data)
    
    if path == "/folders" and method == "POST":
        data = await request.json()
        supabase.table("folders").insert({"user_id": user_id, "name": data.get("name")}).execute()
        return json_response({"message": "Created"})
    
    if path.startswith("/folders/") and path.endswith("/") and method == "DELETE":
        folder_id = int(path.split("/")[2])
        supabase.table("todos").delete().eq("folder_id", folder_id).eq("user_id", user_id).execute()
        supabase.table("folders").delete().eq("id", folder_id).eq("user_id", user_id).execute()
        return json_response({"message": "Deleted"})
    
    # Todos
    if path == "/todos" and method == "GET":
        folder_id = request.params.get("folder_id")
        if folder_id:
            resp = supabase.table("todos").select("*").eq("user_id", user_id).eq("folder_id", folder_id).execute()
        else:
            resp = supabase.table("todos").select("*").eq("user_id", user_id).execute()
        return json_response(resp.data)
    
    if path == "/todos" and method == "POST":
        data = await request.json()
        supabase.table("todos").insert({
            "user_id": user_id,
            "folder_id": data.get("folder_id"),
            "title": data.get("title"),
            "priority": data.get("priority"),
            "due_date": data.get("due_date", ""),
            "due_time": data.get("due_time", "23:59")
        }).execute()
        return json_response({"message": "Created"}, 201)
    
    if path.startswith("/todos/") and method == "PUT":
        todo_id = int(path.split("/")[2])
        data = await request.json()
        supabase.table("todos").update(data).eq("id", todo_id).eq("user_id", user_id).execute()
        return json_response({"message": "Updated"})
    
    if path.startswith("/todos/") and method == "DELETE":
        todo_id = int(path.split("/")[2])
        supabase.table("todos").delete().eq("id", todo_id).eq("user_id", user_id).execute()
        return json_response({"message": "Deleted"})
    
    # Notebooks
    if path == "/notebooks" and method == "GET":
        resp = supabase.table("notebooks").select("*").eq("user_id", user_id).execute()
        if not resp.data:
            supabase.table("notebooks").insert({"user_id": user_id, "name": "My First Notebook"}).execute()
            resp = supabase.table("notebooks").select("*").eq("user_id", user_id).execute()
        return json_response(resp.data)
    
    if path == "/notebooks" and method == "POST":
        data = await request.json()
        supabase.table("notebooks").insert({"user_id": user_id, "name": data.get("name")}).execute()
        return json_response({"message": "Created"}, 201)
    
    if path.startswith("/notebooks/") and method == "DELETE":
        nb_id = int(path.split("/")[2])
        supabase.table("notes").delete().eq("notebook_id", nb_id).eq("user_id", user_id).execute()
        supabase.table("notebooks").delete().eq("id", nb_id).eq("user_id", user_id).execute()
        return json_response({"message": "Deleted"})
    
    # Notes
    if path == "/notes" and method == "GET":
        nb_id = request.params.get("notebook_id")
        if nb_id:
            resp = supabase.table("notes").select("*").eq("user_id", user_id).eq("notebook_id", nb_id).execute()
        else:
            resp = supabase.table("notes").select("*").eq("user_id", user_id).execute()
        return json_response(resp.data)
    
    if path == "/notes" and method == "POST":
        data = await request.json()
        resp = supabase.table("notes").insert({
            "user_id": user_id,
            "notebook_id": data.get("notebook_id"),
            "section": data.get("section", "General"),
            "title": data.get("title", "Untitled"),
            "content": data.get("content", "")
        }).execute()
        return json_response({"message": "Created", "id": resp.data[0]["id"]}, 201)
    
    if path.startswith("/notes/") and method == "GET":
        note_id = int(path.split("/")[2])
        resp = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", user_id).execute()
        if not resp.data:
            return json_response({"message": "Not found"}, 404)
        return json_response(resp.data[0])
    
    if path.startswith("/notes/") and method == "PUT":
        note_id = int(path.split("/")[2])
        data = await request.json()
        supabase.table("notes").update({
            "title": data.get("title"),
            "section": data.get("section"),
            "content": data.get("content"),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", note_id).eq("user_id", user_id).execute()
        return json_response({"message": "Updated"})
    
    if path.startswith("/notes/") and method == "DELETE":
        note_id = int(path.split("/")[2])
        supabase.table("notes").delete().eq("id", note_id).eq("user_id", user_id).execute()
        return json_response({"message": "Deleted"})
    
    # Files
    if path == "/files" and method == "GET":
        resp = supabase.table("files").select("*").eq("user_id", user_id).execute()
        return json_response(resp.data)
    
    if path == "/files" and method == "POST":
        data = await request.json()
        resp = supabase.table("files").insert({
            "user_id": user_id,
            "name": data.get("name"),
            "type": data.get("type"),
            "mime_type": data.get("mimeType"),
            "size": data.get("size", 0),
            "data": data.get("data"),
            "folder_id": data.get("folder_id")
        }).execute()
        return json_response({"message": "Uploaded", "id": resp.data[0]["id"]}, 201)
    
    if path.startswith("/files/") and method == "GET":
        file_id = int(path.split("/")[2])
        resp = supabase.table("files").select("*").eq("id", file_id).eq("user_id", user_id).execute()
        if not resp.data:
            return json_response({"message": "Not found"}, 404)
        return json_response(resp.data[0])
    
    if path.startswith("/files/") and method == "PUT":
        file_id = int(path.split("/")[2])
        data = await request.json()
        supabase.table("files").update({
            "name": data.get("name"),
            "folder_id": data.get("folder_id"),
            "modified_at": datetime.utcnow().isoformat()
        }).eq("id", file_id).eq("user_id", user_id).execute()
        return json_response({"message": "Updated"})
    
    if path.startswith("/files/") and method == "DELETE":
        file_id = int(path.split("/")[2])
        supabase.table("files").delete().eq("id", file_id).eq("user_id", user_id).execute()
        return json_response({"message": "Deleted"})
    
    # File folders
    if path == "/file-folders" and method == "GET":
        resp = supabase.table("file_folders").select("*").eq("user_id", user_id).execute()
        return json_response(resp.data)
    
    if path == "/file-folders" and method == "POST":
        data = await request.json()
        supabase.table("file_folders").insert({
            "user_id": user_id,
            "name": data.get("name"),
            "parent_id": data.get("parent_id")
        }).execute()
        return json_response({"message": "Created"}, 201)
    
    if path.startswith("/file-folders/") and method == "DELETE":
        folder_id = int(path.split("/")[2])
        supabase.table("files").delete().eq("folder_id", folder_id).eq("user_id", user_id).execute()
        supabase.table("file_folders").delete().eq("id", folder_id).eq("user_id", user_id).execute()
        return json_response({"message": "Deleted"})
    
    # Import note to files
    if path.startswith("/files/import-note/") and method == "POST":
        note_id = int(path.split("/")[3])
        resp = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", user_id).execute()
        if not resp.data:
            return json_response({"message": "Note not found"}, 404)
        
        note = resp.data[0]
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
        return json_response({"message": "Imported"})
    
    # URL Shortener - Get all short URLs
    if path == "/short-urls" and method == "GET":
        resp = supabase.table("short_urls").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return json_response(resp.data)
    
    # URL Shortener - Create short URL
    if path == "/short-urls" and method == "POST":
        data = await request.json()
        original_url = data.get("original_url")
        alias = data.get("alias")
        title = data.get("title", "Untitled")
        
        if not original_url or not alias:
            return json_response({"message": "Missing URL or alias"}, 400)
        
        # Check if alias exists
        existing = supabase.table("short_urls").select("*").eq("alias", alias).execute()
        if existing.data:
            return json_response({"message": "Alias already exists"}, 400)
        
        # Create short URL
        base_url = request.url.split("/short-urls")[0]
        short_url = f"{base_url}/s/{alias}"
        
        resp = supabase.table("short_urls").insert({
            "user_id": user_id,
            "original_url": original_url,
            "alias": alias,
            "short_url": short_url,
            "title": title,
            "clicks": 0
        }).execute()
        
        return json_response({"message": "Created", "short_url": short_url, "id": resp.data[0]["id"]}, 201)
    
    # URL Shortener - Delete short URL
    if path.startswith("/short-urls/") and method == "DELETE":
        url_id = int(path.split("/")[2])
        supabase.table("short_urls").delete().eq("id", url_id).eq("user_id", user_id).execute()
        return json_response({"message": "Deleted"})
    
    return json_response({"message": "Not found"}, 404)
