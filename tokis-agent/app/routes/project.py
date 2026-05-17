import os

from fastapi import APIRouter

from core.folder_picker import pick_project_folder

router = APIRouter()


@router.post("/register-project")
def register(data: dict | None = None):
    data = data or {}
    folder = pick_project_folder()

    if not folder:
        return {"error": "No folder selected"}

    if not os.path.isdir(folder):
        return {"error": "Invalid folder"}

    folder_name = os.path.basename(os.path.normpath(folder))
    project_name = (data.get("projectName") or "").strip() or folder_name

    return {
        "path": folder,
        "projectName": project_name,
    }
