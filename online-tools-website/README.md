# XQXing Plushy - Online Tools Website

A modular online tools website featuring Todo List and more tools. Built with HTML, CSS, JavaScript (Frontend) and Python Flask (Backend).

## Features

- **Todo List**: Create, read, update, delete tasks with priority, due dates, and notifications
- Modular architecture for easy feature addition
- RESTful API backend
- Responsive UI/UX

## Project Structure

```
online-tools-website/
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── pages/
├── backend/
│   ├── app.py
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   └── requirements.txt
├── .gitignore
└── README.md
```

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser

## Installation & Setup

### 1. Clone or Download the Repository

```bash
git clone <repository-url>
cd online-tools-website
```

### 2. Setup Backend (Python)

Navigate to the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment:

**On Windows (PowerShell):**
```bash
venv\Scripts\Activate.ps1
```

**On Windows (CMD):**
```bash
venv\Scripts\activate
```

**On macOS/Linux:**
```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Run the Backend Server

```bash
python app.py
```

The backend will run on `http://localhost:5000`

### 4. Run the Frontend (New Terminal)

Navigate to the frontend folder:

```bash
cd frontend
```

Start a simple HTTP server:

**On Windows/macOS/Linux:**
```bash
python -m http.server 8000
```

The frontend will run on `http://localhost:8000`

### 5. Access the Application

Open your browser and go to:
```
http://localhost:8000
```

## API Endpoints

### Health Check
- **GET** `/api/health` - Check if backend is running

### Todo Tasks (Coming Soon)
- **GET** `/api/todos` - Get all tasks
- **POST** `/api/todos` - Create a new task
- **GET** `/api/todos/<id>` - Get a specific task
- **PUT** `/api/todos/<id>` - Update a task
- **DELETE** `/api/todos/<id>` - Delete a task

## Development

### Adding New Features

1. Create a new folder in `frontend/pages/` for the feature
2. Create corresponding route file in `backend/routes/`
3. Create model in `backend/models/` if needed
4. Create controller in `backend/controllers/` if needed
5. Update `backend/app.py` to register new routes

### File Structure for New Feature

```
Feature Name: example_tool

frontend/pages/example_tool.html
frontend/css/example_tool.css
frontend/js/example_tool.js

backend/routes/example_tool_routes.py
backend/models/example_tool.py
backend/controllers/example_tool_controller.py
```

## Troubleshooting

### Backend won't start
- Ensure Python 3.8+ is installed
- Check virtual environment is activated (should see `(venv)` in terminal)
- Verify Flask is installed: `pip install flask flask-cors`

### Port already in use
- Backend: Change port in `app.py` line `app.run(debug=True, port=5001)`
- Frontend: Change port in command: `python -m http.server 8001`

### CORS errors
- Ensure Flask-CORS is installed: `pip install flask-cors`
- Verify backend is running before accessing frontend

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Python, Flask
- **Database**: (To be added)
- **Version Control**: Git

## License

MIT License

## Contributing

Contributions are welcome! Please follow the modular architecture pattern for new features.