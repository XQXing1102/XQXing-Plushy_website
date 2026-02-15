from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    due_date = db.Column(db.DateTime, nullable=True)
    priority = db.Column(db.String(10), nullable=False, default='Medium')
    status = db.Column(db.String(10), nullable=False, default='Pending')

    def __init__(self, title, due_date=None, priority='Medium', status='Pending'):
        self.title = title
        self.due_date = due_date
        self.priority = priority
        self.status = status

    def __repr__(self):
        return f'<Task {self.title} - {self.status}>'