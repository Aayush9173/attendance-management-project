import React, { useState, useEffect, useCallback } from 'react';
import { attendanceApi } from '../../api/attendance';
import type { AttendanceRecord } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Alert } from '../../components/Alert';
import { Modal } from '../../components/Modal';
import { formatDate, formatTime, calculateHoursWorked } from '../../utils/formatters';
import {
  Search,
  Filter,
  Clock,
  RefreshCw,
  Loader2,
  Edit3,
  User,
  Check,
} from 'lucide-react';

interface AdminAttendancePageProps {
  onViewEmployee?: (employeeCode: string) => void;
}

export const AdminAttendancePage: React.FC<AdminAttendancePageProps> = ({ onViewEmployee }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'missing' | 'completed'>('all');

  // Specific Employee Lookup by Employee Code (Requirement 2)
  const [lookupEmployeeCode, setLookupEmployeeCode] = useState('');
  const [isSearchingEmployee, setIsSearchingEmployee] = useState(false);

  // Correction Modal state
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [correctedTime, setCorrectedTime] = useState('18:00');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const fetchAllRecords = useCallback(async () => {
    setFeedback(null);
    try {
      const data = await attendanceApi.getAllAttendance();
      // Sort newest first
      const sorted = [...data].sort(
        (a, b) => new Date(b.mark_date).getTime() - new Date(a.mark_date).getTime()
      );
      setRecords(sorted);
      setIsSearchingEmployee(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to fetch attendance records.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRecords();
  }, [fetchAllRecords]);

  // Lookup attendance for a specific employee code via GET /attendance/user/{employee_code}
  const handleEmployeeLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = lookupEmployeeCode.trim();
    if (!code) {
      setFeedback({ type: 'error', message: 'Please enter an employee code to search (e.g. EMP004).' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await attendanceApi.getUserAttendance(code);
      const sorted = [...data].sort(
        (a, b) => new Date(b.mark_date).getTime() - new Date(a.mark_date).getTime()
      );
      setRecords(sorted);
      setIsSearchingEmployee(true);
      if (data.length === 0) {
        setFeedback({
          type: 'info',
          message: `Employee "${code}" has no attendance records logged yet.`,
        });
      } else {
        setFeedback({
          type: 'info',
          message: `Showing records for Employee "${code}" (${data.length} record${data.length === 1 ? '' : 's'} found).`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || `Failed to fetch attendance for employee code "${code}".`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Client-side filtering
  const filteredRecords = records.filter((r) => {
    const matchesDate = !dateFilter || r.mark_date.includes(dateFilter);
    const filterTerm = userIdFilter.trim().toLowerCase();
    const matchesUser =
      !filterTerm ||
      String(r.employee_id).includes(filterTerm) ||
      (r.employee_name && r.employee_name.toLowerCase().includes(filterTerm)) ||
      (r.employee_code && r.employee_code.toLowerCase().includes(filterTerm));
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && !!r.check_out) ||
      (statusFilter === 'missing' && !r.check_out);
    return matchesDate && matchesUser && matchesStatus;
  });

  // Handle Correction Submission
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;

    if (!correctedTime) {
      setFeedback({ type: 'error', message: 'Please select a valid checkout time.' });
      return;
    }

    // Ensure format is HH:MM:SS
    const formattedTime = correctedTime.length === 5 ? `${correctedTime}:00` : correctedTime;

    setIsSubmittingCorrection(true);
    try {
      const res = await attendanceApi.correctCheckout(correctingRecord.id, formattedTime);
      setFeedback({
        type: 'success',
        message: `${res.message} Checkout set to ${formatTime(res.check_out)}.`,
      });
      setCorrectingRecord(null);
      // Refresh data
      if (isSearchingEmployee && lookupEmployeeCode.trim()) {
        const data = await attendanceApi.getUserAttendance(lookupEmployeeCode.trim());
        const sorted = [...data].sort(
          (a, b) => new Date(b.mark_date).getTime() - new Date(a.mark_date).getTime()
        );
        setRecords(sorted);
      } else {
        const data = await attendanceApi.getAllAttendance();
        const sorted = [...data].sort(
          (a, b) => new Date(b.mark_date).getTime() - new Date(a.mark_date).getTime()
        );
        setRecords(sorted);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to correct missing checkout.',
      });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Attendance Oversight
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitor company-wide punch records, filter by date or employee ID, and correct missing checkouts.
          </p>
        </div>
        <button
          onClick={fetchAllRecords}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh All
        </button>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Employee Code Direct Search Bar (Requirement 2) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleEmployeeLookup} className="flex flex-wrap items-center gap-3">
          <label htmlFor="employee-code-lookup" className="text-xs font-semibold text-slate-700">
            Employee Code:
          </label>
          <div className="relative rounded-lg shadow-xs w-full sm:w-56">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="employee-code-lookup"
              type="text"
              value={lookupEmployeeCode}
              onChange={(e) => setLookupEmployeeCode(e.target.value)}
              placeholder="e.g. EMP004"
              className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={!lookupEmployeeCode.trim() || isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Lookup Employee Logs
          </button>
          {isSearchingEmployee && (
            <button
              type="button"
              onClick={() => {
                setLookupEmployeeCode('');
                fetchAllRecords();
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer"
            >
              Reset to All Employees
            </button>
          )}
        </form>

        <span className="text-xs text-slate-400">
          Showing {filteredRecords.length} of {records.length} records
        </span>
      </div>

      {/* Filters Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="relative rounded-lg shadow-xs w-48">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* User ID Quick Filter */}
          <div className="relative rounded-lg shadow-xs w-48">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="Filter by name / ID..."
              className="block w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {(dateFilter || userIdFilter) && (
            <button
              onClick={() => {
                setDateFilter('');
                setUserIdFilter('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Status
          </button>
          <button
            onClick={() => setStatusFilter('missing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'missing'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Missing Checkout
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Fetching attendance records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Filter className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No records match your criteria</p>
            <p className="text-xs text-slate-400">
              Try adjusting the date, user ID, or status filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Record ID</th>
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Check-in</th>
                  <th className="py-3.5 px-6">Check-out</th>
                  <th className="py-3.5 px-6">Hours Worked</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Source / Admin</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.map((r) => {
                  const isDone = !!r.check_out;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-400">#{r.id}</td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col items-start">
                          {r.employee_code && onViewEmployee ? (
                            <button
                              type="button"
                              onClick={() => onViewEmployee(r.employee_code!)}
                              className="text-left font-bold text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer capitalize"
                              title={`View profile and attendance history for ${r.employee_name || r.employee_code}`}
                            >
                              {r.employee_name || `User #${r.employee_id}`}
                            </button>
                          ) : (
                            <span className="font-bold text-slate-900 capitalize">
                              {r.employee_name || `User #${r.employee_id}`}
                            </span>
                          )}
                          <span className="text-2xs font-mono text-slate-500">
                            {r.employee_code ? `${r.employee_code} • ID #${r.employee_id}` : `ID #${r.employee_id}`}
                          </span>
                        </div>
                      </td>
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
                          <span className="text-xs text-slate-400">Employee</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!isDone ? (
                          <button
                            onClick={() => {
                              setCorrectingRecord(r);
                              setCorrectedTime('18:00');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Correct Checkout
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-2xs uppercase tracking-wider flex items-center justify-end gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Complete
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Correct Missing Checkout Modal */}
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
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Employee:</span>
                <span className="font-bold text-slate-900 capitalize">
                  {correctingRecord.employee_name
                    ? `${correctingRecord.employee_name} (${correctingRecord.employee_code || `#${correctingRecord.employee_id}`})`
                    : `User #${correctingRecord.employee_id}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-bold">{formatDate(correctingRecord.mark_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registered Check-in:</span>
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
              <p className="text-2xs text-slate-400 mt-1">
                Enter the corrected checkout time for this shift date.
              </p>
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
