from fastapi import APIRouter, Body
from pydantic import BaseModel
from typing import List
from app.core.retriever import search_files

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    files: List[str]

@router.post("/query")
def query(data: QueryRequest = Body(...)):
    results = search_files(data.query, data.files)
    return {"snippets": results}