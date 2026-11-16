export type UserRole = 'admin' | 'employee';

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}

export interface AttendanceRecord {
  id: number;
  mark_date: string;
  check_in: string | null;
  check_out: string | null;
  employee_id: number;
  employee_name?: string | null;
  employee_code?: string | null;
  check_out_source: string | null;
  check_out_by: string | null;
  admin_username?: string | null;
}

export interface CheckInResponse {
  message: string;
  check_in: string;
  date: string;
}

export interface CheckOutResponse {
  message: string;
  date: string;
  check_out: string;
  check_in?: string;
}

export interface CheckoutUpdateResponse {
  message: string;
  attendance_id: number;
  date: string;
  check_out: string;
  check_out_source?: string;
  check_out_by?: string;
  checkout_source?: string;
  checkout_by?: string;
}

export interface DefaultSchedule {
  id: number;
  weekday: number;
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
}

export interface ScheduleException {
  id: number;
  date: string;
  employee_id: number | null;
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
}

export interface CreateEmployeePayload {
  employee_code: string;
  user_name: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface UpdateEmployeePayload {
  is_active?: boolean;
  password?: string;
}

export interface CreateAdminPayload {
  employee_code: string;
  user_name: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface CreateDefaultSchedulePayload {
  weekday: number;
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
}

export interface CreateExceptionPayload {
  date: string;
  employee_code: string[] | null;
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
}

export interface CompanySettings {
  id: number;
  latitude: number;
  longitude: number;
  attendance_radius_meters: number;
  location_verification_enabled: boolean;
}

export interface CompanySettingsPayload {
  latitude: number;
  longitude: number;
  attendance_radius_meters: number;
  location_verification_enabled: boolean;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeofenceStatusResponse {
  location_verification_enabled: boolean;
}

export interface EmployeeProfile {
  employee_code: string;
  user_name: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

export interface EmployeeListItem {
  id: number;
  employee_code: string;
  user_name: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}
