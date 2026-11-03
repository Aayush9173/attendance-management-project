from app.database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, UniqueConstraint, Time, Float


class User(Base):

    __tablename__ = "users"

    id = Column(Integer,primary_key=True,nullable=False)
    employee_code = Column(String,nullable=False)
    user_name = Column(String,nullable=False)
    first_name = Column(String(100),nullable=False)
    last_name = Column(String(100),nullable=False)
    role = Column(String,nullable=False)
    hashed_password = Column(String,nullable=False)
    is_active = Column(Boolean,default=True,nullable=False)


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True)
    mark_date = Column(Date, nullable=False)
    check_in = Column(DateTime)
    check_in_photo = Column(String)
    check_out = Column(DateTime)
    check_out_photo = Column(String)
    employee_id = Column(Integer,ForeignKey("users.id"),nullable=False)
    check_out_source = Column(String,nullable=True)
    check_out_by = Column(String,nullable=True)
    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "mark_date",
            name="unique_employee_attendance_per_day"
        ),
    )


class DefaultSchedule(Base):

    __tablename__ = "default_schedules"

    id = Column(Integer, primary_key=True)

    weekday = Column(Integer, nullable=False)

    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    is_day_off = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint(
            "weekday",
            name="uq_default_schedule_weekday"
        ),
    )


class ScheduleException(Base):

    __tablename__ = "schedule_exceptions"

    id = Column(Integer, primary_key=True)

    date = Column(Date, nullable=False)

    employee_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    is_day_off = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint(
            "date",
            "employee_id",
            name="uq_schedule_exception_date_employee"
        ),
    )

class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    attendance_radius_meters = Column(Float,nullable=False,default=100,)

    location_verification_enabled = Column(Boolean,nullable=False,default=False,)