import { apiClient } from './client';
import type {
  CreateEmployeePayload,
  UpdateEmployeePayload,
  CreateAdminPayload,
  CompanySettings,
  CompanySettingsPayload,
  EmployeeProfile,
  EmployeeListItem,
} from '../types';

export interface CreateAdminResponse {
  message: string;
  admin_id: number;
  employee_code: string;
}

export interface UpdateEmployeeResponse {
  message: string;
}

export const adminApi = {
  /**
   * Admin: Create a new employee
   * POST /admin/create/employee
   */
  async createEmployee(payload: CreateEmployeePayload): Promise<void> {
    return apiClient<void>('/admin/create/employee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Admin: Update an employee's active status or password
   * PATCH /admin/update/{employee_code}
   */
  async updateEmployee(
    employeeCode: string,
    payload: UpdateEmployeePayload
  ): Promise<UpdateEmployeeResponse> {
    return apiClient<UpdateEmployeeResponse>(`/admin/update/${encodeURIComponent(employeeCode)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Admin: Create another admin
   * POST /admin/create/admin
   */
  async createAdmin(payload: CreateAdminPayload): Promise<CreateAdminResponse> {
    return apiClient<CreateAdminResponse>('/admin/create/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Admin: Get an individual employee's profile by employee code
   * GET /admin/{employee_code}
   */
  async getEmployee(employeeCode: string): Promise<EmployeeProfile> {
    return apiClient<EmployeeProfile>(`/admin/${encodeURIComponent(employeeCode.trim())}`, {
      method: 'GET',
    });
  },

  /**
   * Admin: Get all employees roster
   * GET /admin/all
   */
  async getAllEmployees(): Promise<EmployeeListItem[]> {
    return apiClient<EmployeeListItem[]>('/admin/all', {
      method: 'GET',
    });
  },

  /**
   * Admin: Get company attendance & geofencing settings
   * GET /admin/settings/company
   */
  async getCompanySettings(): Promise<CompanySettings> {
    return apiClient<CompanySettings>('/admin/settings/company', {
      method: 'GET',
    });
  },

  /**
   * Admin: Create or update company attendance & geofencing settings
   * PUT /admin/settings/company
   */
  async updateCompanySettings(payload: CompanySettingsPayload): Promise<CompanySettings> {
    return apiClient<CompanySettings>('/admin/settings/company', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },
};
