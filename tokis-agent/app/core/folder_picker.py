import subprocess
import sys

_PICKER_CODE = """
import tkinter as tk
from tkinter import filedialog

root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
root.update()
path = filedialog.askdirectory(title="Select Tokis project folder")
print(path or "")
root.destroy()
"""


def pick_project_folder() -> str | None:
    """Open a native folder dialog in a subprocess (safe from FastAPI worker threads)."""
    result = subprocess.run(
        [sys.executable, "-c", _PICKER_CODE],
        capture_output=True,
        text=True,
        timeout=600,
    )
    if result.returncode != 0:
        return None
    path = (result.stdout or "").strip()
    return path if path else None
