import { apiClient } from './client';
import type {
  DefaultSchedule,
  ScheduleException,
  CreateDefaultSchedulePayload,
  CreateExceptionPayload,
} from '../types';

export interface DeleteExceptionResponse {
  message: string;
}

export const scheduleApi = {
  /**
   * Admin: Get default weekly schedules (ordered by weekday)
   * GET /schedule/
   */
  async getDefaultSchedules(): Promise<DefaultSchedule[]> {
    return apiClient<DefaultSchedule[]>('/schedule/', {
      method: 'GET',
    });
  },

  /**
   * Admin: Create or update default weekday schedule
   * PUT /schedule/default/create
   */
  async saveDefaultSchedule(payload: CreateDefaultSchedulePayload): Promise<DefaultSchedule> {
    return apiClient<DefaultSchedule>('/schedule/default/create', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Admin: Get all schedule exceptions
   * GET /schedule/exception
   */
  async getExceptions(): Promise<ScheduleException[]> {
    return apiClient<ScheduleException[]>('/schedule/exception', {
      method: 'GET',
    });
  },

  /**
   * Admin: Create a schedule exception (company-wide or specific employees)
   * POST /schedule/exception/create
   */
  async createException(payload: CreateExceptionPayload): Promise<ScheduleException[]> {
    return apiClient<ScheduleException[]>('/schedule/exception/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Admin: Delete a schedule exception
   * DELETE /schedule/exception/delete/{exception_id}
   */
  async deleteException(exceptionId: number): Promise<DeleteExceptionResponse> {
    return apiClient<DeleteExceptionResponse>(`/schedule/exception/delete/${exceptionId}`, {
      method: 'DELETE',
    });
  },
};
