from fastapi import APIRouter
from app.core.file_reader import read_repo

router = APIRouter()


@router.post("/ingest")
def ingest_repo(data: dict):
    path = data.get("path")
    files = read_repo(path)
    return {"files": files}