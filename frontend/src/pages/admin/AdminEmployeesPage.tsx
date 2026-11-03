import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import type { CreateEmployeePayload, CreateAdminPayload, EmployeeListItem } from '../../types';
import { Alert } from '../../components/Alert';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Loader2,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  User,
  UserCheck,
  UserX,
  ArrowRight,
} from 'lucide-react';

interface AdminEmployeesPageProps {
  onViewEmployee?: (employeeCode: string) => void;
  onNavigateToAttendance?: () => void;
}

export const AdminEmployeesPage: React.FC<AdminEmployeesPageProps> = ({
  onViewEmployee,
  onNavigateToAttendance,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'create-employee' | 'create-admin'>(
    'directory'
  );
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Employee Directory state (Requirement 2)
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form states: Create Employee
  const [empForm, setEmpForm] = useState<CreateEmployeePayload>({
    employee_code: '',
    user_name: '',
    first_name: '',
    last_name: '',
    password: '',
  });
  const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);

  // Form states: Create Admin
  const [adminForm, setAdminForm] = useState<CreateAdminPayload>({
    employee_code: '',
    user_name: '',
    first_name: '',
    last_name: '',
    password: '',
  });
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Fetch employees roster via GET /admin/all (Requirement 2)
  const fetchEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const data = await adminApi.getAllEmployees();
      // Sort newest / higher ID first or by code
      const sorted = [...data].sort((a, b) => a.id - b.id);
      setEmployees(sorted);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to fetch employee directory.',
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Handle Employee Creation
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmittingEmp(true);
    try {
      await adminApi.createEmployee({
        employee_code: empForm.employee_code.trim(),
        user_name: empForm.user_name.trim(),
        first_name: empForm.first_name.trim(),
        last_name: empForm.last_name.trim(),
        password: empForm.password,
      });

      setFeedback({
        type: 'success',
        message: `Employee "${empForm.employee_code}" (${empForm.first_name} ${empForm.last_name}) was successfully created.`,
      });

      setEmpForm({
        employee_code: '',
        user_name: '',
        first_name: '',
        last_name: '',
        password: '',
      });

      // Refresh employee roster immediately
      await fetchEmployees();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to create employee.',
      });
    } finally {
      setIsSubmittingEmp(false);
    }
  };

  // Handle Admin Creation
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmittingAdmin(true);
    try {
      const res = await adminApi.createAdmin({
        employee_code: adminForm.employee_code.trim(),
        user_name: adminForm.user_name.trim(),
        first_name: adminForm.first_name.trim(),
        last_name: adminForm.last_name.trim(),
        password: adminForm.password,
      });

      setFeedback({
        type: 'success',
        message: `${res.message}: Administrator account "${adminForm.user_name}" (ID #${res.admin_id}) registered successfully.`,
      });

      setAdminForm({
        employee_code: '',
        user_name: '',
        first_name: '',
        last_name: '',
        password: '',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to create administrator account.',
      });
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  // Client-side filtering for employee directory
  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.trim().toLowerCase();
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const matchesSearch =
      !q ||
      emp.employee_code.toLowerCase().includes(q) ||
      emp.user_name.toLowerCase().includes(q) ||
      fullName.includes(q) ||
      String(emp.id).includes(q);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && emp.is_active) ||
      (statusFilter === 'inactive' && !emp.is_active);

    return matchesSearch && matchesStatus;
  });

  const activeCount = employees.filter((e) => e.is_active).length;
  const inactiveCount = employees.filter((e) => !e.is_active).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header (Requirement 1: Renamed to User Management) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage company personnel directory, inspect profile details, register new staff, and grant administrator credentials.
          </p>
        </div>
        {onNavigateToAttendance && (
          <button
            type="button"
            onClick={onNavigateToAttendance}
            className="self-start sm:self-auto text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Attendance Oversight</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setActiveTab('directory');
            setFeedback(null);
          }}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'directory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Directory</span>
          <span className="text-2xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('create-employee');
            setFeedback(null);
          }}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'create-employee'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Employee</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('create-admin');
            setFeedback(null);
          }}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'create-admin'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Create Administrator</span>
        </button>
      </div>

      {/* Tab 1: Employee Directory (Requirement 2 & 3) */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Workforce</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{employees.length}</p>
                <p className="text-2xs text-slate-500 mt-0.5">Registered employees</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Accounts</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
                <p className="text-2xs text-emerald-600 font-semibold mt-0.5">Able to log attendance</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Deactivated</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{inactiveCount}</p>
                <p className="text-2xs text-slate-500 mt-0.5">Access disabled</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search, Filter & Actions Toolbar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative rounded-lg shadow-xs w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by code, name, or username..."
                  className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({employees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === 'inactive'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Inactive ({inactiveCount})
                </button>
              </div>

              {(searchQuery || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <span className="text-xs text-slate-400">
                Showing {filteredEmployees.length} of {employees.length}
              </span>
              <button
                type="button"
                onClick={fetchEmployees}
                disabled={isLoadingEmployees}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Refresh employee directory"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmployees ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Employees Table (Requirement 2 & 3) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoadingEmployees ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium">Fetching employee directory...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-20 text-center text-slate-400 space-y-2">
                <Filter className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-medium text-slate-600">
                  {employees.length === 0 ? 'No employees registered yet' : 'No employees match your search'}
                </p>
                <p className="text-xs text-slate-400">
                  {employees.length === 0
                    ? 'Use the "Create Employee" tab to register your first workforce member.'
                    : 'Try clearing your search query or status filter.'}
                </p>
                {employees.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('create-employee')}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register First Employee</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-6">Employee Code</th>
                      <th className="py-3.5 px-6">Full Name</th>
                      <th className="py-3.5 px-6">Username</th>
                      <th className="py-3.5 px-6">Account Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-slate-900">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {emp.employee_code}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-slate-900 capitalize">
                              {emp.first_name} {emp.last_name}
                            </span>
                            <span className="text-2xs text-slate-400">
                              Registered workforce employee
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-600">
                          @{emp.user_name}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={emp.is_active ? 'active' : 'inactive'} />
                        </td>
                        <td className="py-4 px-6 text-right">
                          {onViewEmployee && (
                            <button
                              type="button"
                              onClick={() => onViewEmployee(emp.employee_code)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                              title={`Open profile for ${emp.employee_code}`}
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>View Profile &rarr;</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Create Employee */}
      {activeTab === 'create-employee' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Register New Employee</h2>
            <p className="text-xs text-slate-500 mb-6">
              Create an employee account for attendance recording. The role is automatically assigned as employee and active status is set to true.
            </p>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Employee Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP005"
                    value={empForm.employee_code}
                    onChange={(e) => setEmpForm({ ...empForm, employee_code: e.target.value })}
                    className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                  />
                  <p className="text-2xs text-slate-400 mt-0.5">Unique business code</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username (Login) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jdoe"
                    value={empForm.user_name}
                    onChange={(e) => setEmpForm({ ...empForm, user_name: e.target.value })}
                    className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-2xs text-slate-400 mt-0.5">Used for signing in</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John"
                    value={empForm.first_name}
                    onChange={(e) => setEmpForm({ ...empForm, first_name: e.target.value })}
                    className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Doe"
                    value={empForm.last_name}
                    onChange={(e) => setEmpForm({ ...empForm, last_name: e.target.value })}
                    className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={empForm.password}
                  onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                  className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingEmp}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmittingEmp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Employee Account...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Create Employee</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  View Directory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Create Admin */}
      {activeTab === 'create-admin' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Register New Administrator</h2>
            <p className="text-xs text-slate-500 mb-6">
              Create an administrative user with full permissions to oversee attendance records and schedules.
            </p>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Admin Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ADM002"
                    value={adminForm.employee_code}
                    onChange={(e) => setAdminForm({ ...adminForm, employee_code: e.target.value })}
                    className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username (Login) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin_jane"
                    value={adminForm.user_name}
                    onChange={(e) => setAdminForm({ ...adminForm, user_name: e.target.value })}
                    className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane"
                    value={adminForm.first_name}
                    onChange={(e) => setAdminForm({ ...adminForm, first_name: e.target.value })}
                    className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smith"
                    value={adminForm.last_name}
                    onChange={(e) => setAdminForm({ ...adminForm, last_name: e.target.value })}
                    className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmittingAdmin ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registering Admin Account...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Create Administrator</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  View Directory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
