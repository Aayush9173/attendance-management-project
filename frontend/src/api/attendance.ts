import { apiClient } from './client';
import type {
  AttendanceRecord,
  CheckInResponse,
  CheckOutResponse,
  CheckoutUpdateResponse,
  LocationCoordinates,
  GeofenceStatusResponse,
} from '../types';

export const attendanceApi = {
  /**
   * Check in employee with photo and optional geolocation
   * POST /attendance/check_in (multipart/form-data with image and optional coordinates)
   */
  async checkIn(
    imageFile: File,
    location?: LocationCoordinates | null
  ): Promise<CheckInResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);

    if (location) {
      formData.append('latitude', String(location.latitude));
      formData.append('longitude', String(location.longitude));
      formData.append('accuracy', String(location.accuracy));
    }

    return apiClient<CheckInResponse>('/attendance/check_in', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Check out employee with photo and optional geolocation
   * POST /attendance/check_out (multipart/form-data with image and optional coordinates)
   */
  async checkOut(
    imageFile: File,
    location?: LocationCoordinates | null
  ): Promise<CheckOutResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);

    if (location) {
      formData.append('latitude', String(location.latitude));
      formData.append('longitude', String(location.longitude));
      formData.append('accuracy', String(location.accuracy));
    }

    return apiClient<CheckOutResponse>('/attendance/check_out', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Check if location verification is enabled for attendance
   * GET /attendance/geofence_status
   */
  async getGeofenceStatus(): Promise<GeofenceStatusResponse> {
    return apiClient<GeofenceStatusResponse>('/attendance/geofence_status', {
      method: 'GET',
    });
  },

  /**
   * Get logged-in employee's own attendance records
   * GET /attendance/current_user
   */
  async getMyAttendance(): Promise<AttendanceRecord[]> {
    return apiClient<AttendanceRecord[]>('/attendance/current_user', {
      method: 'GET',
    });
  },

  /**
   * Admin: Get all attendance records across the company
   * GET /attendance/user/all
   */
  async getAllAttendance(): Promise<AttendanceRecord[]> {
    return apiClient<AttendanceRecord[]>('/attendance/user/all', {
      method: 'GET',
    });
  },

  /**
   * Admin: Get attendance records for a specific employee code
   * GET /attendance/user/{employee_code}
   */
  async getUserAttendance(employeeCode: string | number): Promise<AttendanceRecord[]> {
    return apiClient<AttendanceRecord[]>(`/attendance/user/${encodeURIComponent(String(employeeCode).trim())}`, {
      method: 'GET',
    });
  },

  /**
   * Admin: Correct a missing checkout
   * PATCH /attendance/checkout_update/{attendance_id}
   */
  async correctCheckout(attendanceId: number, checkOutTime: string): Promise<CheckoutUpdateResponse> {
    return apiClient<CheckoutUpdateResponse>(`/attendance/checkout_update/${attendanceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ check_out: checkOutTime }),
    });
  },
};
