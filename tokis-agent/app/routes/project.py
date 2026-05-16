from fastapi import APIRouter
import os
from pathlib import Path

router = APIRouter()

@router.post("/register-project")
def register(data: dict):

    project = data["projectName"]

    search_dirs = [

        str(Path.home() / "Desktop"),
        str(Path.home() / "Documents"),
        str(Path.home() / "Downloads"),
        str(Path.home() / "projects"),
        str(Path.home() / "source"),
    ]

    ignored = {
        "node_modules",
        ".git",
        "target",
        "dist",
        "build",
        "__pycache__"
    }

    for base in search_dirs:

        if not os.path.exists(base):
            continue

        for root, dirs, files in os.walk(base):

            dirs[:] = [
                d for d in dirs
                if d not in ignored
            ]

            if os.path.basename(root) == project:

                return {
                    "path": root
                }

    return {
        "error":"project not found"
    }