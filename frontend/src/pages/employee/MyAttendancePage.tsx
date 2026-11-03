import React, { useState, useEffect, useCallback } from 'react';
import { attendanceApi } from '../../api/attendance';
import type { AttendanceRecord } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Alert } from '../../components/Alert';
import { formatDate, formatTime, calculateHoursWorked } from '../../utils/formatters';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Loader2,
  CalendarDays,
} from 'lucide-react';

export const MyAttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchDate, setSearchDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'missing'>('all');

  const fetchRecords = useCallback(async () => {
    setError(null);
    try {
      const data = await attendanceApi.getMyAttendance();
      // Sort newest first
      const sorted = [...data].sort(
        (a, b) => new Date(b.mark_date).getTime() - new Date(a.mark_date).getTime()
      );
      setRecords(sorted);
    } catch (err: any) {
      setError(err?.message || 'Failed to load attendance records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Client-side filtering
  const filteredRecords = records.filter((r) => {
    const matchesDate = !searchDate || r.mark_date.includes(searchDate);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && !!r.check_out) ||
      (statusFilter === 'missing' && !r.check_out);
    return matchesDate && matchesStatus;
  });

  // Calculate metrics
  const totalDays = records.length;
  const completedDays = records.filter((r) => !!r.check_out).length;
  const missingCheckoutDays = records.filter((r) => !r.check_out).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            My Attendance History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review your complete record of working days, check-in, and check-out logs.
          </p>
        </div>
        <button
          onClick={fetchRecords}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Records
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Recorded Days</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalDays}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed Shifts</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{completedDays}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Checkout</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{missingCheckoutDays}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Date search input */}
          <div className="relative rounded-lg shadow-xs w-full sm:w-60">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Filter by date..."
            />
          </div>

          {searchDate && (
            <button
              onClick={() => setSearchDate('')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Clear date
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({records.length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Completed ({completedDays})
          </button>
          <button
            onClick={() => setStatusFilter('missing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'missing'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Missing Checkout ({missingCheckoutDays})
          </button>
        </div>
      </div>

      {/* Attendance Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Loading attendance history...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No records found</p>
            <p className="text-xs text-slate-400">
              {searchDate || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Your attendance records will appear here after you check in.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Check-in Time</th>
                  <th className="py-3.5 px-6">Check-out Time</th>
                  <th className="py-3.5 px-6">Hours Worked</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Remarks / Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.map((record) => {
                  const isDone = !!record.check_out;
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {formatDate(record.mark_date)}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-800">
                        {formatTime(record.check_in)}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-800">
                        {formatTime(record.check_out)}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-700">
                        {calculateHoursWorked(record.check_in, record.check_out)}
                      </td>
                      <td className="py-4 px-6">
                        {isDone ? (
                          <StatusBadge status="completed" />
                        ) : (
                          <StatusBadge status="missing_checkout" />
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {record.check_out_source?.toLowerCase() === 'admin' ? (
                          <span className="inline-flex items-center text-2xs font-bold tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                            Admin ({record.admin_username || record.check_out_by || 'Admin'})
                          </span>
                        ) : record.check_out_source ? (
                          <span className="text-2xs font-semibold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Source: {record.check_out_source}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Self (App)</span>
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
    </div>
  );
};
