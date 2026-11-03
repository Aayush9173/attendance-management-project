from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.dependencies import crypt_context
from app.model import User, CompanySettings
from app.schemas import EmployeeRequestModel, EmployeeUpdateModel, AdminCreateModel, EmployeeResponseModel, CompanySettingsRequest, CompanySettingsResponse
from app.dependencies import get_db
from app.routes.auth import verify_token

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)

db_dependency = Annotated[Session,Depends(get_db)]
user_dependency = Annotated[dict,Depends(verify_token)]

@router.post("/create/employee")
async def create_employee(db : db_dependency,user : user_dependency,employee_data: EmployeeRequestModel):
    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Inactive user")

    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Forbidden")

    employee_exists= db.query(User).filter(User.employee_code == employee_data.employee_code).first()

    if employee_exists:
        raise HTTPException(status_code=400,detail="Employee already exists")


    new_employee = User(
        employee_code = employee_data.employee_code,
        user_name = employee_data.user_name,
        first_name = employee_data.first_name,
        last_name = employee_data.last_name,
        role = "employee",
        hashed_password = crypt_context.hash(employee_data.password),
        is_active = True
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

@router.get("/all",response_model=list[EmployeeResponseModel])
async def get_employees(db: db_dependency,user: user_dependency):
    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Inactive user")
    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Forbidden")

    return db.query(User).filter(func.lower(User.role)=="employee").all()


@router.get("/{employee_code}")
async def get_one_employee(db : db_dependency,user: user_dependency,employee_code : str):

    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Inactive user")

    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Forbidden")

    clean_code = employee_code.strip()
    employee_exists = db.query(User).filter(func.lower(User.employee_code) == clean_code.lower()).first()

    if not employee_exists:
        raise HTTPException(status_code=404,detail="Invalid Employee ID")

    if employee_exists.role.casefold() != "employee":
        raise HTTPException(status_code=403,detail="Employee ID can not be accessed")

    return{
        "employee_code": employee_exists.employee_code,
        "user_name": employee_exists.user_name,
        "first_name": employee_exists.first_name,
        "last_name": employee_exists.last_name,
        "role": employee_exists.role,
        "is_active": employee_exists.is_active
    }

@router.patch("/update/{employee_code}")
async def update_employee(employee_code: str,db: db_dependency,user:user_dependency,update_data: EmployeeUpdateModel):
    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Inactive user")

    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Forbidden")

    clean_code = employee_code.strip()
    employee_exists = db.query(User).filter(func.lower(User.employee_code) == clean_code.lower()).first()

    if not employee_exists:
        raise HTTPException(status_code=400,detail="Invalid Employee ID")

    if employee_exists.role.casefold() != "employee":
        raise HTTPException(status_code=403,detail="Forbidden")

    if update_data.is_active is not None:
        employee_exists.is_active = update_data.is_active

    if update_data.password is not None:
        employee_exists.hashed_password = crypt_context.hash(update_data.password)

    db.commit()
    db.refresh(employee_exists)

    return {
        "message": "Employee updated successfully",
    }

@router.post("/create/admin")
async def create_admin(admin_data: AdminCreateModel, db: db_dependency, user: user_dependency):


    if not user.get("is_active"):
        raise HTTPException(
            status_code=403,
            detail="Inactive user"
        )

    if user.get("UserRole").casefold() != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    existing_user = db.query(User).filter(
        User.employee_code == admin_data.employee_code
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Employee code already exists"
        )

    new_admin = User(
        employee_code=admin_data.employee_code,
        user_name=admin_data.user_name,
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        role="admin",
        hashed_password=crypt_context.hash(admin_data.password),
        is_active=True
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return{
        "message" : "Admin created successfully",
        "admin_id" : new_admin.id,
        "employee_code" : new_admin.employee_code,
    }

@router.get("/settings/company", response_model=CompanySettingsResponse)
async def get_company_settings(db: db_dependency,user:user_dependency):

    if not user.get("is_active"):
        raise HTTPException(status_code=403,detail="Inactive user")

    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(status_code=403,detail="Forbidden")

    record = db.query(CompanySettings).filter(CompanySettings.id == 1).first()

    if record is None:
        raise HTTPException(status_code=404,detail="Setting does not exist")

    return record

@router.put("/settings/company", response_model=CompanySettingsResponse)
async def update_company_settings(settings_data: CompanySettingsRequest,db: db_dependency,user: user_dependency):
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Inactive user")

    if user.get("UserRole", "").casefold() != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    record = db.query(CompanySettings).filter(CompanySettings.id == 1).first()

    if record is None:
        record = CompanySettings(id=1)
        db.add(record)

    record.latitude = settings_data.latitude
    record.longitude = settings_data.longitude
    record.attendance_radius_meters = settings_data.attendance_radius_meters
    record.location_verification_enabled = settings_data.location_verification_enabled

    db.commit()
    db.refresh(record)

    return record