import os
import json
import threading
from typing import Dict, List, Optional
from datetime import datetime
import uuid

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db.json")

class JsonDatabase:
    def __init__(self, file_path: str = DB_FILE):
        self.file_path = file_path
        self.lock = threading.Lock()
        self._init_db()

    def _init_db(self):
        with self.lock:
            if not os.path.exists(self.file_path):
                self._save_data({"users": {}, "projects": {}})

    def _load_data(self) -> dict:
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading database: {e}")
        return {"users": {}, "projects": {}}

    def _save_data(self, data: dict):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving database: {e}")

    # --- User Methods ---
    def create_user(self, email: str, hashed_password: str, name: str) -> dict:
        with self.lock:
            data = self._load_data()
            
            # Check if user already exists
            email_lower = email.strip().lower()
            for user_id, user in data["users"].items():
                if user.get("email", "").lower() == email_lower:
                    raise ValueError("User with this email already exists")

            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": email_lower,
                "hashed_password": hashed_password,
                "name": name.strip(),
                "created_at": datetime.utcnow().isoformat(),
                "tokens": 5,
                "plan": "Free",
                "project_count": 0
            }
            data["users"][user_id] = new_user
            self._save_data(data)
            return new_user

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        with self.lock:
            data = self._load_data()
            return data["users"].get(user_id)

    def get_user_by_email(self, email: str) -> Optional[dict]:
        with self.lock:
            data = self._load_data()
            email_lower = email.strip().lower()
            for user in data["users"].values():
                if user.get("email", "").lower() == email_lower:
                    return user
            return None

    def update_user(self, user_id: str, updates: dict) -> Optional[dict]:
        with self.lock:
            data = self._load_data()
            if user_id not in data["users"]:
                return None
            
            user = data["users"][user_id]
            # Prevent updating id, email, hashed_password here directly
            for k, v in updates.items():
                if k not in ["id", "email", "hashed_password"]:
                    user[k] = v
            
            data["users"][user_id] = user
            self._save_data(data)
            return user

    # --- Project Methods ---
    def create_project(self, user_id: str, name: str, language: str, input_path: str, project_id: str = None) -> dict:
        with self.lock:
            data = self._load_data()
            if user_id not in data["users"]:
                raise ValueError("User not found")

            if not project_id:
                project_id = str(uuid.uuid4())
            new_project = {
                "id": project_id,
                "user_id": user_id,
                "name": name.strip(),
                "status": "pending",
                "language": language,
                "duration": 0.0,
                "input_path": input_path,
                "output_path": "",
                "subtitle_path": "",
                "error_message": "",
                "created_at": datetime.utcnow().isoformat(),
                "token_cost": 1
            }
            data["projects"][project_id] = new_project
            
            # Increment user's project count
            data["users"][user_id]["project_count"] = data["users"][user_id].get("project_count", 0) + 1
            
            self._save_data(data)
            return new_project

    def get_project_by_id(self, project_id: str) -> Optional[dict]:
        with self.lock:
            data = self._load_data()
            return data["projects"].get(project_id)

    def get_projects_by_user(self, user_id: str) -> List[dict]:
        with self.lock:
            data = self._load_data()
            user_projects = []
            for project in data["projects"].values():
                if project.get("user_id") == user_id:
                    user_projects.append(project)
            # Sort by created_at descending
            user_projects.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return user_projects

    def update_project(self, project_id: str, updates: dict) -> Optional[dict]:
        with self.lock:
            data = self._load_data()
            if project_id not in data["projects"]:
                return None
            
            project = data["projects"][project_id]
            for k, v in updates.items():
                if k not in ["id", "user_id"]:
                    project[k] = v
            
            data["projects"][project_id] = project
            self._save_data(data)
            return project

    def delete_project(self, project_id: str, user_id: str) -> bool:
        with self.lock:
            data = self._load_data()
            if project_id not in data["projects"]:
                return False
            
            project = data["projects"][project_id]
            if project.get("user_id") != user_id:
                return False
                
            del data["projects"][project_id]
            
            # Decrement user's project count (clamped to 0)
            if user_id in data["users"]:
                current_count = data["users"][user_id].get("project_count", 0)
                data["users"][user_id]["project_count"] = max(0, current_count - 1)
                
            self._save_data(data)
            return True

db = JsonDatabase()
