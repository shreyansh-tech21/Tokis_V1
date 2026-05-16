from fastapi import FastAPI
from app.routes.project import router

app=FastAPI()
app.include_router(router)