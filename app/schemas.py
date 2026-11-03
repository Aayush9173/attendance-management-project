from datetime import time,date

from pydantic import BaseModel, model_validator


class EmployeeRequestModel(BaseModel):
    employee_code : str
    user_name : str
    first_name : str
    last_name : str
    password : str

class CheckoutPatchRequestModel(BaseModel):
    check_out : time

class TokenRequestModel(BaseModel):
    access_token : str
    token_type: str

class EmployeeUpdateModel(BaseModel):
    is_active: bool | None = None
    password: str | None = None

class AdminCreateModel(BaseModel):
    employee_code: str
    user_name: str
    first_name: str
    last_name: str
    password: str

class DefaultScheduleCreate(BaseModel):
    weekday: int
    start_time: time | None = None
    end_time: time | None = None
    is_day_off: bool = False


    @model_validator(mode="after")
    def validate_schedule(self):

        if not 1 <= self.weekday <= 7:
            raise ValueError("weekday must be between 1 and 7")

        if self.is_day_off:
            if self.start_time is not None or self.end_time is not None:
                raise ValueError(
                    "Day off cannot have start or end time"
                )

        else:
            if self.start_time is None or self.end_time is None:
                raise ValueError(
                    "Working day requires start and end time"
                )

            if self.start_time >= self.end_time:
                raise ValueError(
                    "Start time must be before end time"
                )

        return self

class DefaultScheduleResponse(BaseModel):
    id: int
    weekday: int
    start_time: time | None
    end_time: time | None
    is_day_off: bool

    model_config = {
        "from_attributes": True
    }

class ScheduleExceptionCreate(BaseModel):
    date: date
    employee_code: list[str] | None = None
    start_time: time | None = None
    end_time: time | None = None
    is_day_off: bool = False

class ScheduleExceptionResponse(BaseModel):
    id: int
    date: date
    employee_id: int | None
    start_time: time | None
    end_time: time | None
    is_day_off: bool

    model_config = {
        "from_attributes": True
    }

class EmployeeResponseModel(BaseModel):
    id: int
    employee_code: str
    user_name: str
    first_name: str
    last_name: str
    is_active: bool

    model_config = {
        "from_attributes": True
    }

class CompanySettingsRequest(BaseModel):
    latitude: float
    longitude: float
    attendance_radius_meters: float = 100
    location_verification_enabled: bool = False

class CompanySettingsResponse(BaseModel):
    id: int
    latitude: float
    longitude: float
    attendance_radius_meters: float
    location_verification_enabled: bool

    model_config = {
        "from_attributes": True
    }