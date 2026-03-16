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
    return payload;
  } catch {
    return null;
  }
}

async function supabaseRequest(endpoint, method, body, userId, bypassRls = false) {
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
    const payload = verifyToken(auth);
    const userId = payload?.user_id || null;
    const isAdmin = payload?.role === "admin";

    // Get IP for banning
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";

    // Root - redirect to frontend
    if (path === "/" || path === "") {
      return Response.redirect("https://xqpl-tool.pages.dev/landing.html", 302);
    }

    // Reset password - placeholder
    if (path === "/reset-password") {
      return jsonResponse({ message: "Use admin panel" });
    }

    // Register
    if (path === "/register" && method === "POST") {
      const { username, email, password } = await request.json();
      if (!username || !email || !password) {
        return jsonResponse({ message: "Missing fields" }, 400);
      }
      
      // Check IP ban
      const { data: banData } = await supabaseRequest(`banned_ips?ip=eq.${clientIP}`, "GET", null, null);
      if (banData && banData.length > 0) {
        return jsonResponse({ message: "Your IP is banned" }, 403);
      }

      const hashedPassword = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));

      // Special case: If XQXing_1102, check if exists and update instead
      if (username.toLowerCase() === "xqxing_1102") {
        const { data: existing } = await supabaseRequest(`users?username=eq.${username}`, "GET", null, null);
        if (existing && existing.length > 0) {
          await supabaseRequest(`users?username=eq.${username}`, "PATCH", {
            password: hashedPassword,
            role: "admin",
            status: "active"
          }, null, true);
          return jsonResponse({ message: "Admin account updated" }, 200);
        }
      }

      const { data, status } = await supabaseRequest("users", "POST", {
        username,
        email,
        password: hashedPassword,
        role: username.toLowerCase() === "xqxing_1102" ? "admin" : "user",
        status: "active",
        created_at: new Date().toISOString()
      }, null, true);

      if (status > 300) {
        return jsonResponse({ message: "Error: " + JSON.stringify(data) }, 400);
      }

      // Create default folder
      await supabaseRequest("folders", "POST", { user_id: data[0].id, name: "General" }, data[0].id, true);
      await supabaseRequest("notebooks", "POST", { user_id: data[0].id, name: "My First Notebook" }, data[0].id, true);

      // Log registration
      await supabaseRequest("admin_logs", "POST", {
        action: "user_registered",
        user_id: data[0].id,
        username: username,
        ip: clientIP,
        created_at: new Date().toISOString()
      }, null, true);

      return jsonResponse({ message: "User registered" }, 201);
    }

    // Login
    if (path === "/login" && method === "POST") {
      const { username, password } = await request.json();
      
      // Check IP ban
      const { data: banData } = await supabaseRequest(`banned_ips?ip=eq.${clientIP}`, "GET", null, null);
      if (banData && banData.length > 0) {
        return jsonResponse({ message: "Your IP is banned" }, 403);
      }
      
      const { data, status } = await supabaseRequest(`users?username=eq.${username}`, "GET", null, null);
      
      if (!data || data.length === 0) {
        return jsonResponse({ message: "Invalid credentials" }, 401);
      }

      const user = data[0];
      
      // Check if banned
      if (user.status === "banned") {
        return jsonResponse({ message: "Account is banned" }, 403);
      }

      const hashedPassword = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));

      if (user.password !== hashedPassword) {
        // Log failed login
        await supabaseRequest("admin_logs", "POST", {
          action: "failed_login",
          user_id: user.id,
          username: username,
          ip: clientIP,
          created_at: new Date().toISOString()
        }, null, true);
        return jsonResponse({ message: "Invalid credentials" }, 401);
      }

      const token = btoa(JSON.stringify({
        user_id: user.id,
        username: user.username,
        role: user.role || "user",
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
      }));

      // Log successful login
      await supabaseRequest("admin_logs", "POST", {
        action: "login",
        user_id: user.id,
        username: user.username,
        ip: clientIP,
        created_at: new Date().toISOString()
      }, null, true);

      return jsonResponse({ token, role: user.role || "user", message: "Login successful" });
    }

    // Public: Check if username is admin (for redirect)
    if (path === "/check-admin" && method === "GET") {
      const username = url.searchParams.get("username");
      if (username === "XQXing_1102") {
        return jsonResponse({ isAdmin: true });
      }
      return jsonResponse({ isAdmin: false });
    }

    // Protected routes
    if (!userId) {
      return jsonResponse({ message: "Unauthorized" }, 401);
    }

    // Get current user info
    if (path === "/me" && method === "GET") {
      const { data } = await supabaseRequest(`users?id=eq.${userId}`, "GET", null, userId);
      if (data && data.length > 0) {
        const user = data[0];
        delete user.password;
        return jsonResponse(user);
      }
      return jsonResponse({ message: "User not found" }, 404);
    }

    // ============= ADMIN ROUTES =============
    if (isAdmin) {
      // Admin: Get all users
      if (path === "/admin/users" && method === "GET") {
        const { data } = await supabaseRequest("users?order=created_at.desc", "GET", null, null, true);
        const users = data.map(u => {
          delete u.password;
          return u;
        });
        return jsonResponse(users);
      }

      // Admin: Get single user with all data
      if (path === "/admin/users/" && method === "GET") {
        const targetUserId = path.split("/")[3];
        const { data: user } = await supabaseRequest(`users?id=eq.${targetUserId}`, "GET", null, null, true);
        const { data: todos } = await supabaseRequest(`todos?user_id=eq.${targetUserId}`, "GET", null, null, true);
        const { data: notes } = await supabaseRequest(`notes?user_id=eq.${targetUserId}`, "GET", null, null, true);
        const { data: folders } = await supabaseRequest(`folders?user_id=eq.${targetUserId}`, "GET", null, null, true);
        const { data: files } = await supabaseRequest(`files?user_id=eq.${targetUserId}`, "GET", null, null, true);
        
        if (user && user.length > 0) {
          delete user[0].password;
          return jsonResponse({
            user: user[0],
            stats: {
              todos: todos?.length || 0,
              notes: notes?.length || 0,
              folders: folders?.length || 0,
              files: files?.length || 0
            }
          });
        }
        return jsonResponse({ message: "User not found" }, 404);
      }

      // Admin: Update user (ban, role, etc)
      if (path.startsWith("/admin/users/") && method === "PUT") {
        const targetUserId = path.split("/")[3];
        const body = await request.json();
        
        // Log action
        await supabaseRequest("admin_logs", "POST", {
          action: "user_updated",
          admin_id: userId,
          target_user_id: targetUserId,
          changes: JSON.stringify(body),
          ip: clientIP,
          created_at: new Date().toISOString()
        }, null, true);

        await supabaseRequest(`users?id=eq.${targetUserId}`, "PATCH", body, null, true);
        return jsonResponse({ message: "User updated" });
      }

      // Admin: Wipe user account (delete all data)
      if (path.startsWith("/admin/users/") && method === "DELETE") {
        const targetUserId = path.split("/")[3];
        
        // Don't allow deleting admin
        const { data: targetUser } = await supabaseRequest(`users?id=eq.${targetUserId}`, "GET", null, null, true);
        if (targetUser && targetUser[0].role === "admin") {
          return jsonResponse({ message: "Cannot delete admin" }, 403);
        }

        // Delete all user data
        await supabaseRequest(`todos?user_id=eq.${targetUserId}`, "DELETE", null, null, true);
        await supabaseRequest(`notes?user_id=eq.${targetUserId}`, "DELETE", null, null, true);
        await supabaseRequest(`folders?user_id=eq.${targetUserId}`, "DELETE", null, null, true);
        await supabaseRequest(`files?user_id=eq.${targetUserId}`, "DELETE", null, null, true);
        await supabaseRequest(`notebooks?user_id=eq.${targetUserId}`, "DELETE", null, null, true);
        await supabaseRequest(`file_folders?user_id=eq.${targetUserId}`, "DELETE", null, null, true);
        await supabaseRequest(`users?id=eq.${targetUserId}`, "DELETE", null, null, true);

        // Log action
        await supabaseRequest("admin_logs", "POST", {
          action: "user_wiped",
          admin_id: userId,
          target_user_id: targetUserId,
          ip: clientIP,
          created_at: new Date().toISOString()
        }, null, true);

        return jsonResponse({ message: "User account wiped" });
      }

      // Admin: Ban IP
      if (path === "/admin/ban-ip" && method === "POST") {
        const { ip, reason } = await request.json();
        
        await supabaseRequest("banned_ips", "POST", {
          ip,
          reason: reason || "Banned by admin",
          banned_by: userId,
          created_at: new Date().toISOString()
        }, null, true);

        await supabaseRequest("admin_logs", "POST", {
          action: "ip_banned",
          admin_id: userId,
          target_ip: ip,
          reason: reason,
          ip: clientIP,
          created_at: new Date().toISOString()
        }, null, true);

        return jsonResponse({ message: "IP banned" });
      }

      // Admin: Unban IP
      if (path === "/admin/unban-ip" && method === "POST") {
        const { ip } = await request.json();
        await supabaseRequest(`banned_ips?ip=eq.${ip}`, "DELETE", null, null, true);
        
        await supabaseRequest("admin_logs", "POST", {
          action: "ip_unbanned",
          admin_id: userId,
          target_ip: ip,
          ip: clientIP,
          created_at: new Date().toISOString()
        }, null, true);

        return jsonResponse({ message: "IP unbanned" });
      }

      // Admin: Get banned IPs
      if (path === "/admin/banned-ips" && method === "GET") {
        const { data } = await supabaseRequest("banned_ips?order=created_at.desc", "GET", null, null, true);
        return jsonResponse(data);
      }

      // Admin: Get all logs
      if (path === "/admin/logs" && method === "GET") {
        const { data } = await supabaseRequest("admin_logs?order=created_at.desc&limit=100", "GET", null, null, true);
        return jsonResponse(data);
      }

      // Admin: Get stats
      if (path === "/admin/stats" && method === "GET") {
        const { data: users } = await supabaseRequest("users", "GET", null, null, true);
        const { data: todos } = await supabaseRequest("todos", "GET", null, null, true);
        const { data: notes } = await supabaseRequest("notes", "GET", null, null, true);
        const { data: files } = await supabaseRequest("files", "GET", null, null, true);
        const { data: logs } = await supabaseRequest("admin_logs?created_at=gte." + new Date(Date.now() - 7*24*60*60*1000).toISOString(), "GET", null, null, true);

        const stats = {
          totalUsers: users?.length || 0,
          totalTodos: todos?.length || 0,
          totalNotes: notes?.length || 0,
          totalFiles: files?.length || 0,
          recentLogs: logs?.length || 0,
          activeUsers: users?.filter(u => u.status === "active").length || 0,
          bannedUsers: users?.filter(u => u.status === "banned").length || 0
        };
        return jsonResponse(stats);
      }

      // Admin: Promote user to admin
      if (path === "/admin/promote" && method === "POST") {
        const { userId: targetUserId, role } = await request.json();
        await supabaseRequest(`users?id=eq.${targetUserId}`, "PATCH", { role }, null, true);
        
        await supabaseRequest("admin_logs", "POST", {
          action: "user_promoted",
          admin_id: userId,
          target_user_id: targetUserId,
          new_role: role,
          ip: clientIP,
          created_at: new Date().toISOString()
        }, null, true);

        return jsonResponse({ message: "User promoted" });
      }
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
