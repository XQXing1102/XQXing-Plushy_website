# XQXing-Plushy_website
This is a website that is created by xing and plushy

Discord User:

- Xing(main collbarator,leader): xqxing201073
- Plushy(main collbarator,leader): piyushizu



# 🧸 XQXing-Plushy — Online Tools Website

A modern multi-tool web platform built using **HTML, CSS, JavaScript & Python (Flask)**.  
First tool included: **Smart Todo Manager** with CRUD, priority, due date & notifications.

This project is designed to scale into a **full tools website** (password generator, JSON formatter, AI tools, etc).

---

# 🚀 Features (Current)

## 📝 Todo Tool
- Add task  
- Edit/update task  
- Delete task  
- Mark complete  
- Due date support  
- Priority (Low/Medium/High)  
- Browser notifications 🔔  
- Modern UI  
- Backend storage (SQLite)

## 🌐 Platform Vision
This is not just a todo app — it's a **multi-tool platform**.  

Future tools:
- Password generator  
- JSON formatter  
- AI tools  
- File tools  
- Calculator  
- More…

---

# 🛠️ Tech Stack

### Frontend
- HTML  
- CSS  
- JavaScript  

### Backend
- Python (Flask)  
- SQLite (auto created)

---

# 📁 Project Structure
XQXing-Plushy/
│
├── backend/
│ ├── app.py
│ └── database.db (auto created)
│
├── frontend/
│ ├── index.html
│ ├── todo.html
│ ├── css/
│ │ └── style.css
│ └── js/
│ ├── main.js
│ └── todo.js
│
└── README.md


---

# ⚙️ SETUP ON NEW SYSTEM (FULL GUIDE)

Follow these steps on any computer (Windows/Mac/Linux).

---

# 🔵 STEP 1 — Install Requirements

## Install Python (if not installed)
Download:
https://www.python.org/downloads/

Check installation:
python --version


---

# 🔵 STEP 2 — Clone or Copy Project

If using Git:
git clone <your-repo-link>
cd XQXing-Plushy


Or just copy project folder to new system.

---

# 🔵 STEP 3 — Install Backend Libraries

Open terminal in project folder:
cd backend
pip install flask flask-cors


---

# 🔵 STEP 4 — Run Backend Server

Inside backend folder:
python app.py


You should see:
Running on http://127.0.0.1:5000


⚠️ Keep this terminal running always.

This starts:
- Database  
- API  
- Todo backend  

---

# 🔵 STEP 5 — Run Frontend (IMPORTANT)

Open new terminal.

Go to frontend:
cd frontend


Run server:
python -m http.server 5500


Open browser:
http://localhost:5500


Now open:
http://localhost:5500/index.html


---

# 🔵 STEP 6 — Use Todo Tool

Click:
Smart Todo Manager


Test features:
- Add task  
- Delete task  
- Complete task  
- Priority  
- Due date  
- Notification  

If working → setup successful ✅

---

# 🔔 Enable Notifications
When browser asks:
Allow notifications?

Click **Allow**

You will get reminder if task due today.

---

# 🧪 API Test (Optional)

Open browser:
http://127.0.0.1:5000/todos


You should see JSON data.  
Means backend working.

---

# 🛑 Common Errors & Fix

## ❌ Error: fetch failed
✔ Backend not running  
Run:
python app.py


---

## ❌ Port already in use
Change port in app.py:
```python
app.run(debug=True, port=5001)
❌ Python not recognized
Install Python and restart PC.

🌍 Deploy on Internet (Later)
You can deploy free on:

Render (backend)

Vercel/Netlify (frontend)

Ask for deployment guide.

🔥 Future Roadmap
Phase 1
Login system

User accounts

Save todos per user

Phase 2
Modern dashboard

Dark/light theme

Drag & drop tasks

Phase 3
AI todo planner

Email reminders

WhatsApp reminders

Full tools platform

👨‍💻 Developer
Project: XQXing-Plushy
Purpose: Multi-tools website platform

Built using:
Python + JS + HTML + CSS

😈 Next Upgrades (Choose)
Login system

Modern UI like Apple

AI todo

Full tools website

Deploy online

Admin panel

Mobile responsive

EVERYTHING (startup level)

