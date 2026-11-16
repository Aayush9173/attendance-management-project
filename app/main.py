from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import admin, attendance, auth, schedule

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.1.38:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(admin.router)
app.include_router(schedule.router)