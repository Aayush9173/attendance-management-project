from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.routes.auth import verify_token
from app.dependencies import get_db
from app.model import DefaultSchedule, User, ScheduleException
from app.schemas import DefaultScheduleCreate,ScheduleExceptionCreate, DefaultScheduleResponse,ScheduleExceptionResponse
router = APIRouter(
    prefix="/schedule",
    tags=["schedule"]
)

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(verify_token)]


@router.get("/")
async def get_schedule(db: db_dependency,user: user_dependency):
    if user.get("UserRole","").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Unauthorized")

    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Unauthorized")

    schedule = db.query(DefaultSchedule).order_by(DefaultSchedule.weekday).all()

    return schedule

@router.put("/default/create", response_model=DefaultScheduleResponse)
async def create_schedule(db: db_dependency,user: user_dependency,schedule_data: DefaultScheduleCreate):
    if user.get("UserRole","").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Unauthorized")

    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Unauthorized")

    schedule = db.query(DefaultSchedule).filter(DefaultSchedule.weekday == schedule_data.weekday).first()

    if schedule:
        schedule.start_time = schedule_data.start_time
        schedule.end_time = schedule_data.end_time
        schedule.is_day_off = schedule_data.is_day_off
    else:
        schedule = DefaultSchedule(
        weekday=schedule_data.weekday,
        start_time=schedule_data.start_time,
        end_time=schedule_data.end_time,
        is_day_off=schedule_data.is_day_off
    )
        db.add(schedule)

    db.commit()
    db.refresh(schedule)

    return schedule

@router.post("/exception/create",response_model=list[ScheduleExceptionResponse])
async def create_exception(db: db_dependency,user: user_dependency,exception_data: ScheduleExceptionCreate):
    if user.get("UserRole","").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Unauthorized")

    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Unauthorized")


    if exception_data.employee_code is not None:

        if len(exception_data.employee_code) == 0:
            raise HTTPException(status_code=400,detail="Employee id cannot be empty")

        employees = db.query(User).filter(User.employee_code.in_(exception_data.employee_code),func.lower(User.role) == "employee").all()

        if len(employees) != len(set(exception_data.employee_code)):
            raise HTTPException(status_code=400,detail="One or more Employee are invalid!")

        employee_id = [ employee.id for employee in employees]

        employees_exception = db.query(ScheduleException).filter(ScheduleException.date == exception_data.date,ScheduleException.employee_id.in_(employee_id)).all()

        if employees_exception:
            raise HTTPException(status_code=400,detail="Schedule already exists!")

        exception_schedule = []

        for employee in employees:
            exception = ScheduleException(
                date=exception_data.date,
                employee_id=employee.id,
                start_time=exception_data.start_time,
                end_time=exception_data.end_time,
                is_day_off=exception_data.is_day_off
            )
            db.add(exception)
            exception_schedule.append(exception)


    else:

        existing_exception = db.query(ScheduleException).filter(ScheduleException.date == exception_data.date,ScheduleException.employee_id.is_(None)).first()

        if existing_exception:
            raise HTTPException(status_code=400,detail="Schedule already exists!")

        exception_schedule = ScheduleException(
            date=exception_data.date,
            employee_id=None,
            start_time=exception_data.start_time,
            end_time=exception_data.end_time,
            is_day_off=exception_data.is_day_off
        )

        db.add(exception_schedule)
        exception_schedule = [exception_schedule]

    db.commit()

    for exception in exception_schedule:
        db.refresh(exception)

    return exception_schedule


@router.get("/exception", response_model=list[ScheduleExceptionResponse])
async def get_exception(
    db: db_dependency,
    user: user_dependency
):
    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(
            status_code=403,
            detail="Unauthorized"
        )

    if not user.get("is_active"):
        raise HTTPException(
            status_code=403,
            detail="Unauthorized"
        )

    exceptions = (
        db.query(ScheduleException)
        .order_by(ScheduleException.date)
        .all()
    )

    return exceptions


@router.delete("/exception/delete/{exception_id}")
async def exception_delete(db: db_dependency,user: user_dependency,exception_id: int):
    if user.get("UserRole","").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Unauthorized")

    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Unauthorized")

    exception = db.query(ScheduleException).filter(ScheduleException.id == exception_id).first()

    if not exception:
        raise HTTPException(status_code=404,detail="Schedule does not exist!")

    db.delete(exception)
    db.commit()

    return {"message": "Schedule exception deleted successfully"}