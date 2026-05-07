from fastapi import APIRouter, Body
from pydantic import BaseModel
from typing import List
from app.core.retriever import search_files
from app.core.prompt_builder import build_prompt

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    files: List[str]

@router.post("/query")
def query(data: dict):
    query=data.get("query")
    files=data.get("files")
    snippets = search_files(query, files)
    prompt = build_prompt(query, snippets)
    return {"prompt": prompt,"snippets":snippets}