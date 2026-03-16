const SUPABASE_URL = "https://vmtvzhcwsoycuzgclgdu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdHZ6aGN3c295Y3V6Z2NsZ2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTMzMTAsImV4cCI6MjA4OTIyOTMxMH0.gk43WZnAO9ogZtQNdistLGVuGuXFspgCZ0coyyUrj8E";
const SECRET_KEY = "dev-secret-key";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function verifyToken(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return payload.user_id;
  } catch {
    return null;
  }
}

async function supabaseRequest(endpoint, method, body, userId) {
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": method === "POST" ? "return=representation" : "return=minimal"
  };
  
  if (userId) {
    headers["x-user-id"] = userId;
  }

  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const options = { method, headers };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();
  return { data, status: res.status };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const auth = request.headers.get("Authorization") || "";
    const userId = verifyToken(auth);

    // Root - redirect to frontend
    if (path === "/" || path === "") {
      return Response.redirect("https://xqpl-tool.pages.dev/landing.html", 302);
    }

    // Register
    if (path === "/register" && method === "POST") {
      const { username, email, password } = await request.json();
      if (!username || !email || !password) {
        return jsonResponse({ message: "Missing fields" }, 400);
      }
      
      const hashedPassword = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));

      const { data, status } = await supabaseRequest("users", "POST", {
        username,
        email,
        password: hashedPassword
      }, null);

      if (status > 300) {
        return jsonResponse({ message: "Username or email exists" }, 400);
      }

      // Create default folder
      await supabaseRequest("folders", "POST", { user_id: data[0].id, name: "General" }, data[0].id);
      await supabaseRequest("notebooks", "POST", { user_id: data[0].id, name: "My First Notebook" }, data[0].id);

      return jsonResponse({ message: "User registered" }, 201);
    }

    // Login
    if (path === "/login" && method === "POST") {
      const { username, password } = await request.json();
      
      const { data, status } = await supabaseRequest(`users?username=eq.${username}`, "GET", null, null);
      
      if (!data || data.length === 0) {
        return jsonResponse({ message: "Invalid credentials" }, 401);
      }

      const user = data[0];
      const hashedPassword = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));

      if (user.password !== hashedPassword) {
        return jsonResponse({ message: "Invalid credentials" }, 401);
      }

      const token = btoa(JSON.stringify({
        user_id: user.id,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
      }));

      return jsonResponse({ token, message: "Login successful" });
    }

    // Protected routes
    if (!userId) {
      return jsonResponse({ message: "Unauthorized" }, 401);
    }

    // Folders
    if (path === "/folders" && method === "GET") {
      const { data } = await supabaseRequest(`folders?user_id=eq.${userId}`, "GET", null, userId);
      return jsonResponse(data);
    }

    if (path === "/folders" && method === "POST") {
      const { name } = await request.json();
      await supabaseRequest("folders", "POST", { user_id: userId, name }, userId);
      return jsonResponse({ message: "Created" });
    }

    if (path.startsWith("/folders/") && method === "DELETE") {
      const folderId = path.split("/")[2];
      await supabaseRequest(`todos?folder_id=eq.${folderId}&user_id=eq.${userId}`, "DELETE", null, userId);
      await supabaseRequest(`folders?id=eq.${folderId}&user_id=eq.${userId}`, "DELETE", null, userId);
      return jsonResponse({ message: "Deleted" });
    }

    // Todos
    if (path === "/todos" && method === "GET") {
      const folderId = url.searchParams.get("folder_id");
      const filter = folderId ? `user_id=eq.${userId}&folder_id=eq.${folderId}` : `user_id=eq.${userId}`;
      const { data } = await supabaseRequest(`todos?${filter}`, "GET", null, userId);
      return jsonResponse(data);
    }

    if (path === "/todos" && method === "POST") {
      const body = await request.json();
      await supabaseRequest("todos", "POST", { ...body, user_id: userId }, userId);
      return jsonResponse({ message: "Created" }, 201);
    }

    if (path.startsWith("/todos/") && method === "PUT") {
      const todoId = path.split("/")[2];
      const body = await request.json();
      await supabaseRequest(`todos?id=eq.${todoId}&user_id=eq.${userId}`, "PATCH", body, userId);
      return jsonResponse({ message: "Updated" });
    }

    if (path.startsWith("/todos/") && method === "DELETE") {
      const todoId = path.split("/")[2];
      await supabaseRequest(`todos?id=eq.${todoId}&user_id=eq.${userId}`, "DELETE", null, userId);
      return jsonResponse({ message: "Deleted" });
    }

    // Notebooks
    if (path === "/notebooks" && method === "GET") {
      const { data } = await supabaseRequest(`notebooks?user_id=eq.${userId}`, "GET", null, userId);
      if (!data || data.length === 0) {
        await supabaseRequest("notebooks", "POST", { user_id: userId, name: "My First Notebook" }, userId);
        const { data: newData } = await supabaseRequest(`notebooks?user_id=eq.${userId}`, "GET", null, userId);
        return jsonResponse(newData);
      }
      return jsonResponse(data);
    }

    if (path === "/notebooks" && method === "POST") {
      const { name } = await request.json();
      await supabaseRequest("notebooks", "POST", { user_id: userId, name }, userId);
      return jsonResponse({ message: "Created" }, 201);
    }

    if (path.startsWith("/notebooks/") && method === "DELETE") {
      const nbId = path.split("/")[2];
      await supabaseRequest(`notes?notebook_id=eq.${nbId}&user_id=eq.${userId}`, "DELETE", null, userId);
      await supabaseRequest(`notebooks?id=eq.${nbId}&user_id=eq.${userId}`, "DELETE", null, userId);
      return jsonResponse({ message: "Deleted" });
    }

    // Notes
    if (path === "/notes" && method === "GET") {
      const nbId = url.searchParams.get("notebook_id");
      const filter = nbId ? `user_id=eq.${userId}&notebook_id=eq.${nbId}` : `user_id=eq.${userId}`;
      const { data } = await supabaseRequest(`notes?${filter}`, "GET", null, userId);
      return jsonResponse(data);
    }

    if (path === "/notes" && method === "POST") {
      const body = await request.json();
      const { data } = await supabaseRequest("notes", "POST", { ...body, user_id: userId }, userId);
      return jsonResponse({ message: "Created", id: data?.[0]?.id }, 201);
    }

    if (path.startsWith("/notes/") && method === "GET") {
      const noteId = path.split("/")[2];
      const { data } = await supabaseRequest(`notes?id=eq.${noteId}&user_id=eq.${userId}`, "GET", null, userId);
      if (!data || data.length === 0) return jsonResponse({ message: "Not found" }, 404);
      return jsonResponse(data[0]);
    }

    if (path.startsWith("/notes/") && method === "PUT") {
      const noteId = path.split("/")[2];
      const body = await request.json();
      await supabaseRequest(`notes?id=eq.${noteId}&user_id=eq.${userId}`, "PATCH", { ...body, updated_at: new Date().toISOString() }, userId);
      return jsonResponse({ message: "Updated" });
    }

    if (path.startsWith("/notes/") && method === "DELETE") {
      const noteId = path.split("/")[2];
      await supabaseRequest(`notes?id=eq.${noteId}&user_id=eq.${userId}`, "DELETE", null, userId);
      return jsonResponse({ message: "Deleted" });
    }

    // Files
    if (path === "/files" && method === "GET") {
      const { data } = await supabaseRequest(`files?user_id=eq.${userId}`, "GET", null, userId);
      return jsonResponse(data);
    }

    if (path === "/files" && method === "POST") {
      const body = await request.json();
      const { data } = await supabaseRequest("files", "POST", { ...body, user_id: userId }, userId);
      return jsonResponse({ message: "Uploaded", id: data?.[0]?.id }, 201);
    }

    if (path.startsWith("/files/") && method === "GET") {
      const fileId = path.split("/")[2];
      const { data } = await supabaseRequest(`files?id=eq.${fileId}&user_id=eq.${userId}`, "GET", null, userId);
      if (!data || data.length === 0) return jsonResponse({ message: "Not found" }, 404);
      return jsonResponse(data[0]);
    }

    if (path.startsWith("/files/") && method === "PUT") {
      const fileId = path.split("/")[2];
      const body = await request.json();
      await supabaseRequest(`files?id=eq.${fileId}&user_id=eq.${userId}`, "PATCH", { ...body, modified_at: new Date().toISOString() }, userId);
      return jsonResponse({ message: "Updated" });
    }

    if (path.startsWith("/files/") && method === "DELETE") {
      const fileId = path.split("/")[2];
      await supabaseRequest(`files?id=eq.${fileId}&user_id=eq.${userId}`, "DELETE", null, userId);
      return jsonResponse({ message: "Deleted" });
    }

    // File Folders
    if (path === "/file-folders" && method === "GET") {
      const { data } = await supabaseRequest(`file_folders?user_id=eq.${userId}`, "GET", null, userId);
      return jsonResponse(data);
    }

    if (path === "/file-folders" && method === "POST") {
      const body = await request.json();
      await supabaseRequest("file_folders", "POST", { ...body, user_id: userId }, userId);
      return jsonResponse({ message: "Created" }, 201);
    }

    if (path.startsWith("/file-folders/") && method === "DELETE") {
      const folderId = path.split("/")[2];
      await supabaseRequest(`files?folder_id=eq.${folderId}&user_id=eq.${userId}`, "DELETE", null, userId);
      await supabaseRequest(`file_folders?id=eq.${folderId}&user_id=eq.${userId}`, "DELETE", null, userId);
      return jsonResponse({ message: "Deleted" });
    }

    return jsonResponse({ message: "Not found" }, 404);
  }
};
