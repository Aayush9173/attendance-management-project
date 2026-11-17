import os
from getpass import getpass

from sqlalchemy.exc import IntegrityError

from app.database import LocalSession
from app.dependencies import crypt_context
from app.model import User


def create_initial_admin():
    db = LocalSession()

    try:
        # Prevent accidentally creating duplicate accounts.
        existing_admin = (
            db.query(User)
            .filter(User.role.ilike("admin"))
            .first()
        )

        if existing_admin:
            print(
                f"An admin already exists: "
                f"{existing_admin.employee_code} ({existing_admin.user_name}). Skipping creation."
            )
            return

        # Check for non-interactive environment variables first.
        env_employee_code = os.getenv("ADMIN_EMPLOYEE_CODE")
        env_user_name = os.getenv("ADMIN_USERNAME")
        env_password = os.getenv("ADMIN_PASSWORD")
        env_first_name = os.getenv("ADMIN_FIRST_NAME", "System")
        env_last_name = os.getenv("ADMIN_LAST_NAME", "Administrator")

        if env_employee_code and env_user_name and env_password:
            print("Creating initial admin account using environment variables...")
            employee_code = env_employee_code.strip()
            user_name = env_user_name.strip()
            first_name = env_first_name.strip()
            last_name = env_last_name.strip()
            password = env_password
        else:
            print("Create the initial admin account.")

            employee_code = input("Admin employee code: ").strip()
            user_name = input("Admin username: ").strip()
            first_name = input("First name: ").strip()
            last_name = input("Last name: ").strip()

            if not all([employee_code, user_name, first_name, last_name]):
                print("All fields are required.")
                return

            password = getpass("Admin password: ")
            confirm_password = getpass("Confirm password: ")

            if not password:
                print("Password cannot be empty.")
                return

            if password != confirm_password:
                print("Passwords do not match.")
                return

        # Check both identifiers to avoid duplicate accounts.
        existing_user = (
            db.query(User)
            .filter(
                (User.employee_code == employee_code)
                | (User.user_name == user_name)
            )
            .first()
        )

        if existing_user:
            print(
                "That employee code or username is already in use."
            )
            return

        admin = User(
            employee_code=employee_code,
            user_name=user_name,
            first_name=first_name,
            last_name=last_name,
            role="admin",
            hashed_password=crypt_context.hash(password),
            is_active=True,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("\nInitial admin created successfully.")
        print(f"Admin ID: {admin.id}")
        print(f"Employee code: {admin.employee_code}")
        print(f"Username: {admin.user_name}")

    except IntegrityError:
        db.rollback()
        print(
            "Could not create the admin because a database "
            "constraint was violated."
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_initial_admin()
