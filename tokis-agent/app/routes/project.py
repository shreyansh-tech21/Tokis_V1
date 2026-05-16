from fastapi import APIRouter
from tkinter import Tk
from tkinter.filedialog import askdirectory

router=APIRouter()

@router.post("/search-folder")
def search_folder():
    root=Tk()
    root.withdraw()
    path=askdirectory()
    root.destroy()

    return {
        "path":path
    }