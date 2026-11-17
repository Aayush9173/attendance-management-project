import React, { useState, useEffect, useCallback } from 'react';
import { attendanceApi } from '../../api/attendance';
import { scheduleApi } from '../../api/schedule';
import type { AttendanceRecord } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Alert } from '../../components/Alert';
import { formatDate, formatTime, calculateHoursWorked } from '../../utils/formatters';
import {
  Users,
  CalendarCheck2,
  CalendarDays,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertOctagon,
  TrendingUp,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[] | null>(null);
  const [exceptionsCount, setExceptionsCount] = useState<number | null>(null);
  const [schedulesCount, setSchedulesCount] = useState<number | null>(null);

  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [exceptionsError, setExceptionsError] = useState<string | null>(null);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAttendanceError(null);
    setExceptionsError(null);
    setSchedulesError(null);

    try {
      const [attendanceResult, exceptionsResult, schedulesResult] = await Promise.allSettled([
        attendanceApi.getAllAttendance(),
        scheduleApi.getExceptions(),
        scheduleApi.getDefaultSchedules(),
      ]);

      const errorParts: string[] = [];

      // 1. Attendance Records
      if (attendanceResult.status === 'fulfilled') {
        setAttendanceRecords(attendanceResult.value);
      } else {
        const msg = attendanceResult.reason?.message || 'Failed to load attendance logs';
        setAttendanceError(msg);
        errorParts.push(`Attendance: ${msg}`);
      }

      // 2. Schedule Exceptions
      if (exceptionsResult.status === 'fulfilled') {
        setExceptionsCount(exceptionsResult.value.length);
      } else {
        const msg = exceptionsResult.reason?.message || 'Failed to load schedule exceptions';
        setExceptionsError(msg);
        errorParts.push(`Exceptions: ${msg}`);
      }

      // 3. Default Schedules
      if (schedulesResult.status === 'fulfilled') {
        setSchedulesCount(schedulesResult.value.length);
      } else {
        const msg = schedulesResult.reason?.message || 'Failed to load default schedules';
        setSchedulesError(msg);
        errorParts.push(`Weekly Schedules: ${msg}`);
      }

      if (errorParts.length > 0) {
        setError(`Some overview data could not be loaded: ${errorParts.join(' | ')}`);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while loading dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculations
  const todayStr = getTodayIsoDate();
  const safeRecords = attendanceRecords ?? [];
  const todayRecords = safeRecords.filter((r) => r.mark_date === todayStr);
  const missingCheckouts = safeRecords.filter((r) => !r.check_out);
  const completedRecords = safeRecords.filter((r) => !!r.check_out);

  // Requirement 1: Only the latest 5 attendance records, sorted newest to oldest by date and check-in time
  const recentRecords = [...safeRecords]
    .sort((a, b) => {
      const dateDiff = new Date(b.mark_date).getTime() - new Date(a.mark_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const timeA = a.check_in ? new Date(a.check_in).getTime() : 0;
      const timeB = b.check_in ? new Date(b.check_in).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return b.id - a.id;
    })
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            Executive Oversight
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            Administrator Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time attendance logs, employee rosters, and company schedule configuration.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Records</p>
            {attendanceError ? (
              <>
                <p className="text-sm font-semibold text-rose-500 mt-1">Unavailable</p>
                <p className="text-2xs text-slate-400 mt-0.5">Failed to load</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {attendanceRecords !== null ? attendanceRecords.length : '—'}
                </p>
                <p className="text-2xs text-slate-500 mt-0.5">{completedRecords.length} completed</p>
              </>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Checkins */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today&apos;s Logs</p>
            {attendanceError ? (
              <>
                <p className="text-sm font-semibold text-rose-500 mt-1">Unavailable</p>
                <p className="text-2xs text-slate-400 mt-0.5">Failed to load</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {attendanceRecords !== null ? todayRecords.length : '—'}
                </p>
                <p className="text-2xs text-emerald-600 font-semibold mt-0.5">Active today</p>
              </>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Missing Checkout Action Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Missing Checkout</p>
            {attendanceError ? (
              <>
                <p className="text-sm font-semibold text-rose-500 mt-1">Unavailable</p>
                <p className="text-2xs text-slate-400 mt-0.5">Failed to load</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {attendanceRecords !== null ? missingCheckouts.length : '—'}
                </p>
                <p className="text-2xs text-slate-500 mt-0.5">Requires correction</p>
              </>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Schedule Exceptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Exceptions</p>
            {exceptionsError ? (
              <p className="text-sm font-semibold text-rose-500 mt-1">Unavailable</p>
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {exceptionsCount !== null ? exceptionsCount : '—'}
              </p>
            )}
            {schedulesError ? (
              <p className="text-2xs text-rose-500 mt-0.5">Schedule count unavailable</p>
            ) : (
              <p className="text-2xs text-slate-500 mt-0.5">
                {schedulesCount !== null ? `${schedulesCount} weekdays defined` : '—'}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('admin-attendance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
            <span>Manage Attendance</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            View all employee logs, filter records, and correct missing checkouts.
          </p>
        </button>

        <button
          onClick={() => onNavigate('admin-employees')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center justify-between">
            <span>User Management</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            View employee directory, register staff, manage account access, and reset credentials.
          </p>
        </button>

        <button
          onClick={() => onNavigate('admin-schedule')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
            <CalendarDays className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 transition-colors flex items-center justify-between">
            <span>Default Schedules</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure working hours, start/end shift times, and official weekly days off.
          </p>
        </button>

        <button
          onClick={() => onNavigate('admin-exceptions')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition-colors flex items-center justify-between">
            <span>Schedule Exceptions</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Add company holidays or assign custom hours for individual employees.
          </p>
        </button>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Attendance Activity</h3>
            <p className="text-xs text-slate-500">Five most recent entries logged across all team members</p>
          </div>
          <button
            onClick={() => onNavigate('admin-attendance')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            Open Attendance Manager &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs">Loading activity stream...</p>
            </div>
          ) : attendanceError ? (
            <div className="py-12 text-center text-xs text-rose-500 flex flex-col items-center justify-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
              <p className="font-semibold">Unable to load attendance records</p>
              <p className="text-slate-400 text-2xs">{attendanceError}</p>
            </div>
          ) : safeRecords.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No attendance records logged yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">ID</th>
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Check-in</th>
                  <th className="py-3 px-6">Check-out</th>
                  <th className="py-3 px-6">Hours Worked</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-6 font-mono text-slate-400">#{r.id}</td>
                    <td className="py-3 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 capitalize">
                          {r.employee_name || `User #${r.employee_id}`}
                        </span>
                        {r.employee_code && (
                          <span className="text-2xs font-mono text-slate-400">
                            {r.employee_code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6">{formatDate(r.mark_date)}</td>
                    <td className="py-3 px-6 font-medium">{formatTime(r.check_in)}</td>
                    <td className="py-3 px-6 font-medium">{formatTime(r.check_out)}</td>
                    <td className="py-3 px-6 font-medium text-slate-700">
                      {calculateHoursWorked(r.check_in, r.check_out)}
                    </td>
                    <td className="py-3 px-6">
                      {r.check_out ? (
                        <StatusBadge status="completed" />
                      ) : (
                        <StatusBadge status="missing_checkout" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
