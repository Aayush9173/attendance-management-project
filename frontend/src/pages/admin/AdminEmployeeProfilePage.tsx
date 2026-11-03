import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import { attendanceApi } from '../../api/attendance';
import type { EmployeeProfile, AttendanceRecord } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Alert } from '../../components/Alert';
import { Modal } from '../../components/Modal';
import { formatDate, formatTime, calculateHoursWorked } from '../../utils/formatters';
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  KeyRound,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Edit3,
} from 'lucide-react';

interface AdminEmployeeProfilePageProps {
  employeeCode: string;
  onBack: (targetTab?: string) => void;
  originTab?: string;
}

export const AdminEmployeeProfilePage: React.FC<AdminEmployeeProfilePageProps> = ({
  employeeCode,
  onBack,
  originTab = 'admin-employees',
}) => {
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  // Password reset state
  const [newPassword, setNewPassword] = useState<string>('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState<boolean>(false);

  // Status update state
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState<boolean>(false);

  // Checkout correction modal state
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [correctedTime, setCorrectedTime] = useState<string>('18:00');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState<boolean>(false);

  const fetchProfileAndAttendance = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [empData, attData] = await Promise.all([
        adminApi.getEmployee(employeeCode),
        attendanceApi.getUserAttendance(employeeCode).catch(() => []),
      ]);

      setEmployee(empData);
      const sorted = [...attData].sort(
        (a, b) => new Date(b.mark_date).getTime() - new Date(a.mark_date).getTime()
      );
      setAttendanceRecords(sorted);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || `Failed to load profile for employee "${employeeCode}".`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [employeeCode]);

  useEffect(() => {
    fetchProfileAndAttendance();
  }, [fetchProfileAndAttendance]);

  // Handle active status toggle
  const handleStatusToggle = async (newActiveStatus: boolean) => {
    if (!employee) return;
    setIsSubmittingStatus(true);
    try {
      const res = await adminApi.updateEmployee(employee.employee_code, {
        is_active: newActiveStatus,
      });
      setEmployee({ ...employee, is_active: newActiveStatus });
      setFeedback({
        type: 'success',
        message: `${res.message}: Employee "${employee.employee_code}" is now ${
          newActiveStatus ? 'Active' : 'Inactive'
        }.`,
      });
      setConfirmDeactivateOpen(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to update employee status.',
      });
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !newPassword.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a valid password.' });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await adminApi.updateEmployee(employee.employee_code, {
        password: newPassword,
      });
      setNewPassword('');
      setFeedback({
        type: 'success',
        message: `${res.message}: Password for employee "${employee.employee_code}" has been updated.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to reset password.',
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Handle attendance checkout correction
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;

    const formattedTime = correctedTime.length === 5 ? `${correctedTime}:00` : correctedTime;
    setIsSubmittingCorrection(true);
    try {
      const res = await attendanceApi.correctCheckout(correctingRecord.id, formattedTime);
      setFeedback({
        type: 'success',
        message: `${res.message} Checkout set to ${formatTime(res.check_out)}.`,
      });
      setCorrectingRecord(null);
      // Refresh attendance logs
      const updated = await attendanceApi.getUserAttendance(employeeCode);
      const sorted = [...updated].sort(
        (a, b) => new Date(b.mark_date).getTime() - new Date(a.mark_date).getTime()
      );
      setAttendanceRecords(sorted);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to correct missing checkout.',
      });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Metrics
  const totalDays = attendanceRecords.length;
  const completedDays = attendanceRecords.filter((r) => !!r.check_out).length;
  const missingDays = attendanceRecords.filter((r) => !r.check_out).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onBack(originTab)}
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
            title={`Back to ${originTab === 'admin-attendance' ? 'Attendance Oversight' : 'User Management'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {originTab === 'admin-attendance' ? 'Attendance Oversight' : 'User Management'}</span>
          </button>
          <span className="text-slate-300">/</span>
          {originTab === 'admin-attendance' ? (
            <button
              type="button"
              onClick={() => onBack('admin-employees')}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Management</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onBack('admin-attendance')}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Attendance Oversight</span>
            </button>
          )}
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md font-mono">
            {employeeCode}
          </span>
        </div>

        <button
          type="button"
          onClick={fetchProfileAndAttendance}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Profile</span>
        </button>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {isLoading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading employee profile...</p>
        </div>
      ) : !employee ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Employee Profile Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No employee record with code &ldquo;{employeeCode}&rdquo; could be found.
          </p>
          <button
            type="button"
            onClick={() => onBack('admin-attendance')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
          >
            Return to Attendance Oversight
          </button>
        </div>
      ) : (
        <>
          {/* Employee Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-xl uppercase flex items-center justify-center ring-1 ring-indigo-200 shrink-0">
                {employee.first_name?.[0]}
                {employee.last_name?.[0]}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900 capitalize">
                    {employee.first_name} {employee.last_name}
                  </h1>
                  <StatusBadge status={employee.is_active ? 'active' : 'inactive'} />
                  <StatusBadge status="employee" label="Employee" />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 font-mono">
                  <span>Code: <strong className="text-slate-800">{employee.employee_code}</strong></span>
                  <span>•</span>
                  <span>Username: <strong className="text-slate-800">{employee.user_name}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Management Card (Requirement 4) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Account Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage access permissions and credentials for this specific employee account.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              {/* Active Status Control */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Account Active Status</h3>
                    <StatusBadge status={employee.is_active ? 'active' : 'inactive'} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {employee.is_active
                      ? 'This account is active. The employee can sign in, record attendance, and access their dashboard.'
                      : 'This account is deactivated. The employee cannot sign in or record attendance.'}
                  </p>
                </div>

                <div>
                  {employee.is_active ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeactivateOpen(true)}
                      disabled={isSubmittingStatus}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Deactivate Account
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(true)}
                      disabled={isSubmittingStatus}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      {isSubmittingStatus ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Activating...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Activate Account</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Password Reset Control */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Employee Password</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign a new login password for {employee.first_name}. Existing password will be replaced.
                  </p>
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-3">
                  <div className="relative rounded-lg shadow-xs">
                    <input
                      type="password"
                      required
                      placeholder="Enter new secure password..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isSubmittingPassword}
                      className="block w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingPassword || !newPassword.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {isSubmittingPassword ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Apply New Password</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Attendance History Card (Requirement 3) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
            <div className="p-6 sm:p-8 pb-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Attendance History</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Individual punch log records for {employee.first_name} {employee.last_name}.
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Total: {totalDays}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Completed: {completedDays}
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Missing: {missingDays}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              {attendanceRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No attendance logs on record</p>
                  <p className="text-xs text-slate-400">
                    This employee has not recorded any check-in or checkout activity yet.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-6">Record ID</th>
                      <th className="py-3.5 px-6">Date</th>
                      <th className="py-3.5 px-6">Check-in Time</th>
                      <th className="py-3.5 px-6">Check-out Time</th>
                      <th className="py-3.5 px-6">Hours Worked</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Source / Admin</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {attendanceRecords.map((r) => {
                      const isDone = !!r.check_out;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6 font-mono text-slate-400">#{r.id}</td>
                          <td className="py-4 px-6 font-semibold text-slate-800">
                            {formatDate(r.mark_date)}
                          </td>
                          <td className="py-4 px-6 font-medium text-slate-800">
                            {formatTime(r.check_in)}
                          </td>
                          <td className="py-4 px-6 font-medium text-slate-800">
                            {formatTime(r.check_out)}
                          </td>
                          <td className="py-4 px-6 font-medium text-slate-700">
                            {calculateHoursWorked(r.check_in, r.check_out)}
                          </td>
                          <td className="py-4 px-6">
                            {isDone ? (
                              <StatusBadge status="completed" />
                            ) : (
                              <StatusBadge status="missing_checkout" />
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {r.check_out_source?.toLowerCase() === 'admin' ? (
                              <span className="inline-flex items-center gap-1 text-2xs font-bold tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                ADMIN ({r.admin_username || r.check_out_by || 'Admin'})
                              </span>
                            ) : r.check_out_source ? (
                              <span className="text-2xs font-semibold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {r.check_out_source}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Self (App)</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {!isDone && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCorrectingRecord(r);
                                  setCorrectedTime('18:00');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Correct Checkout
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={confirmDeactivateOpen}
        onClose={() => setConfirmDeactivateOpen(false)}
        title="Confirm Account Deactivation"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to deactivate employee{' '}
            <strong>
              {employee?.first_name} {employee?.last_name} ({employee?.employee_code})
            </strong>
            ? Deactivated employees cannot log into the system or record attendance check-in/out.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmDeactivateOpen(false)}
              disabled={isSubmittingStatus}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleStatusToggle(false)}
              disabled={isSubmittingStatus}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              {isSubmittingStatus ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Deactivating...</span>
                </>
              ) : (
                <span>Confirm Deactivation</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Checkout Correction Modal */}
      <Modal
        isOpen={!!correctingRecord}
        onClose={() => setCorrectingRecord(null)}
        title="Correct Missing Checkout"
        maxWidth="md"
      >
        {correctingRecord && (
          <form onSubmit={handleCorrectionSubmit} className="space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Record ID:</span>
                <span className="font-mono font-bold">#{correctingRecord.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-bold">{formatDate(correctingRecord.mark_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Check-in Registered:</span>
                <span className="font-bold text-emerald-700">{formatTime(correctingRecord.check_in)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Checkout Time (HH:MM or HH:MM:SS) <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
                <input
                  type="time"
                  step="1"
                  required
                  value={correctedTime}
                  onChange={(e) => setCorrectedTime(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCorrectingRecord(null)}
                disabled={isSubmittingCorrection}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingCorrection}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                {isSubmittingCorrection ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Correction...</span>
                  </>
                ) : (
                  <span>Confirm Checkout Correction</span>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
