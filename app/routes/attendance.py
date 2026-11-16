from datetime import date, datetime
from typing import Annotated
from uuid import uuid4

from sqlalchemy import func
from io import BytesIO
from PIL import Image, UnidentifiedImageError
from app.schemas import CheckoutPatchRequestModel
from fastapi import APIRouter, Depends, UploadFile, HTTPException, Form
from pathlib import Path
from sqlalchemy.orm import Session
from app.model import Attendance, User, CompanySettings
from app.routes.auth import get_db, verify_token
import math

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)

db_dependency = Annotated[Session,Depends(get_db)]
user_dependency = Annotated[dict,Depends(verify_token)]

MAX_IMAGE_SIZE = 5 * 1024 * 1024


def calculate_distance_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    earth_radius = 6_371_000

    lat1, lon1, lat2, lon2 = map(
        math.radians,
        (lat1, lon1, lat2, lon2),
    )

    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(delta_lon / 2) ** 2
    )

    a = min(1.0, a)

    return 2 * earth_radius * math.asin(math.sqrt(a))

def validate_employee_location(
    db: Session,
    latitude: float | None,
    longitude: float | None,
    accuracy: float | None,
) -> None:
    settings = (
        db.query(CompanySettings)
        .filter(CompanySettings.id == 1)
        .first()
    )

    # No settings or disabled verification means no geofence.
    if settings is None or not settings.location_verification_enabled:
        return

    # Location is required when verification is enabled.
    if latitude is None or longitude is None or accuracy is None:
        raise HTTPException(
            status_code=400,
            detail="Location coordinates and accuracy are required",
        )

    if not all(
        math.isfinite(value)
        for value in (latitude, longitude, accuracy)
    ):
        raise HTTPException(
            status_code=400,
            detail="Location values must be finite numbers",
        )

    if not -90 <= latitude <= 90:
        raise HTTPException(
            status_code=400,
            detail="Invalid latitude",
        )

    if not -180 <= longitude <= 180:
        raise HTTPException(
            status_code=400,
            detail="Invalid longitude",
        )

    if not 0 < accuracy <= 100:
        raise HTTPException(
            status_code=400,
            detail="Location accuracy is insufficient",
        )

    distance = calculate_distance_meters(
        settings.latitude,
        settings.longitude,
        latitude,
        longitude,
    )

    if distance > settings.attendance_radius_meters:
        raise HTTPException(
            status_code=403,
            detail="You are outside the permitted attendance area",
        )



def serialize_attendance_record(att: Attendance, user_map: dict[int, User]) -> dict:
    emp = user_map.get(att.employee_id)
    emp_name = f"{emp.first_name} {emp.last_name}" if emp else None
    emp_code = emp.employee_code if emp else None

    admin_username = None
    if att.check_out_source and att.check_out_source.lower() == "admin" and att.check_out_by:
        if str(att.check_out_by).isdigit():
            adm = user_map.get(int(att.check_out_by))
            admin_username = adm.user_name if adm else att.check_out_by
        else:
            admin_username = att.check_out_by

    return {
        "id": att.id,
        "mark_date": att.mark_date,
        "check_in": att.check_in,
        "check_out": att.check_out,
        "employee_id": att.employee_id,
        "employee_name": emp_name,
        "employee_code": emp_code,
        "check_out_source": att.check_out_source,
        "check_out_by": att.check_out_by,
        "admin_username": admin_username,
    }



async def validate_attendance_photo(image: UploadFile):

    contents = await image.read(MAX_IMAGE_SIZE + 1)

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image size cannot exceed 5 MB"
        )

    try:
        with Image.open(BytesIO(contents)) as photo:
            if photo.format != "JPEG":
                raise HTTPException(
                    status_code=400,
                    detail="Only JPEG images are accepted"
                )

            photo.verify()

    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="Invalid image file"
        )

    finally:
        await image.close()

@router.post("/check_in")
async def attendance_check_in(image: UploadFile,db : db_dependency,user : user_dependency,
                              latitude : float | None=Form(default=None),
                              longitude : float | None=Form(default=None),
                              accuracy : float | None=Form(default=None)):
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Inactive user")

    today = date.today()

    existing_attendance = db.query(Attendance).filter(Attendance.employee_id == user.get("UserId"), Attendance.mark_date == today).first()

    if existing_attendance:
        raise HTTPException(status_code=400, detail="Attendance already exists")

    validate_employee_location(db,latitude,longitude,accuracy)

    await validate_attendance_photo(image)

    attendance = Attendance(
        mark_date = today,
        check_in = datetime.now(),
        employee_id = user.get("UserId")
    )

    db.add(attendance)
    db.commit()

    return{
        "message": "Attendance registered successfully!",
        "check_in" : attendance.check_in,
        "date" : attendance.mark_date

    }

@router.post("/check_out")
async def attendance_check_out(image: UploadFile,db : db_dependency,user : user_dependency,
                              latitude : float | None=Form(default=None),
                              longitude : float | None=Form(default=None),
                              accuracy : float | None=Form(default=None)):
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Inactive user")

    today = date.today()

    existing_attendance = db.query(Attendance).filter(Attendance.employee_id == user.get("UserId"), Attendance.mark_date == today).first()

    if not existing_attendance:
        raise HTTPException(status_code=400, detail="Checkin does not exist")

    if existing_attendance.check_out is not None:
        raise HTTPException(
            status_code=400,
            detail="Checkout already recorded"
        )

    validate_employee_location(db,latitude,longitude,accuracy)

    await validate_attendance_photo(image)

    existing_attendance.check_out = datetime.now()
    existing_attendance.employee_id = user.get("UserId")

    db.commit()

    return{
        "message": "Attendance registered successfully!",
        "date": existing_attendance.mark_date,
        "check_out" : existing_attendance.check_out
    }


@router.get("/current_user")
async def employee_all(db : db_dependency,user : user_dependency):
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Inactive user")

    records = db.query(Attendance).filter(Attendance.employee_id == user.get("UserId")).all()
    users = {u.id: u for u in db.query(User).all()}
    return [serialize_attendance_record(r, users) for r in records]

@router.get("/geofence_status")
async def get_geofence_status(db: db_dependency, user: user_dependency):
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Inactive user")

    settings = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    return {
        "location_verification_enabled": settings.location_verification_enabled if settings else False
    }

@router.get("/user/all")
async def attendance_user_all(db : db_dependency,user : user_dependency):
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Inactive user")

    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(status_code=400, detail="Access denied")

    records = db.query(Attendance).all()
    users = {u.id: u for u in db.query(User).all()}
    return [serialize_attendance_record(r, users) for r in records]

@router.get("/user/{employee_code}")
def attendance_user(employee_code: str,db: db_dependency,user: user_dependency):


    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Inactive user")

    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Access denied")

    clean_code = employee_code.strip()
    employee = (db.query(User).filter(func.lower(User.employee_code) == clean_code.lower()).first())

    if not employee or employee.role.casefold() != "employee":
        raise HTTPException(status_code=404,detail="Employee not found")

    records = (db.query(Attendance).filter(Attendance.employee_id == employee.id).all())

    users = {u.id: u for u in db.query(User).all()}

    return [serialize_attendance_record(record, users) for record in records]

@router.patch("/checkout_update/{attendance_id}")
async def admin_checkout(attendance_id : int,db : db_dependency,user : user_dependency, checkout_model : CheckoutPatchRequestModel):
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Inactive user")

    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(status_code=400, detail="Access denied")

    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()

    if not attendance:
        raise HTTPException(status_code=400, detail="Attendance does not exist")

    if attendance.check_out is not None:
        raise HTTPException(status_code=400, detail="Checkout already exists")

    corrected_checkout = datetime.combine(
        attendance.mark_date,
        checkout_model.check_out
    )

    admin_username = user.get("UserName") or str(user.get("UserId"))
    attendance.check_out = corrected_checkout
    attendance.check_out_source = "admin"
    attendance.check_out_by = admin_username

    db.commit()
    db.refresh(attendance)

    return {
        "message": "Checkout corrected successfully",
        "attendance_id": attendance.id,
        "date": attendance.mark_date,
        "check_out": attendance.check_out,
        "check_out_source": attendance.check_out_source,
        "check_out_by": attendance.check_out_by,
        "checkout_source": attendance.check_out_source,
        "checkout_by": attendance.check_out_by,
        "admin_username": admin_username,
    }