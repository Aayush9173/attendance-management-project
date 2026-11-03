import React, { useState, useEffect, useCallback } from 'react';
import { scheduleApi } from '../../api/schedule';
import type { ScheduleException, CreateExceptionPayload } from '../../types';
import { Alert } from '../../components/Alert';
import { Modal } from '../../components/Modal';
import { formatDate, formatTime } from '../../utils/formatters';
import {
  AlertOctagon,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Coffee,
  Briefcase,
  Users,
  Globe,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export const AdminExceptionsPage: React.FC = () => {
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Create Exception Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    date: string;
    scope: 'all' | 'specific';
    employeeCodesInput: string;
    is_day_off: boolean;
    start_time: string;
    end_time: string;
  }>({
    date: '',
    scope: 'all',
    employeeCodesInput: '',
    is_day_off: true,
    start_time: '10:00',
    end_time: '18:00',
  });

  // Delete Confirmation Modal
  const [deletingException, setDeletingException] = useState<ScheduleException | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchExceptions = useCallback(async () => {
    setFeedback(null);
    try {
      const data = await scheduleApi.getExceptions();
      // Sort by date ascending
      const sorted = [...data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setExceptions(sorted);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to fetch schedule exceptions.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date) {
      setFeedback({ type: 'error', message: 'Please select a date for the exception.' });
      return;
    }

    let employeeCodes: string[] | null = null;
    if (formData.scope === 'specific') {
      const parsed = formData.employeeCodesInput
        .split(/[\s,]+/)
        .map((c) => c.trim())
        .filter(Boolean);

      if (parsed.length === 0) {
        setFeedback({
          type: 'error',
          message: 'Please enter at least one employee code for employee-specific exceptions.',
        });
        return;
      }
      employeeCodes = parsed;
    }

    // Working day validation
    if (!formData.is_day_off) {
      if (!formData.start_time || !formData.end_time) {
        setFeedback({ type: 'error', message: 'Working day exceptions require both start and end times.' });
        return;
      }
      if (formData.start_time >= formData.end_time) {
        setFeedback({ type: 'error', message: 'Start time must be before end time.' });
        return;
      }
    }

    const payload: CreateExceptionPayload = {
      date: formData.date,
      employee_code: employeeCodes,
      is_day_off: formData.is_day_off,
      start_time: formData.is_day_off ? null : `${formData.start_time}:00`,
      end_time: formData.is_day_off ? null : `${formData.end_time}:00`,
    };

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const createdList = await scheduleApi.createException(payload);
      setFeedback({
        type: 'success',
        message: `Successfully created ${createdList.length} schedule exception(s) for ${formatDate(
          formData.date
        )}.`,
      });
      setIsCreateOpen(false);
      setFormData({
        date: '',
        scope: 'all',
        employeeCodesInput: '',
        is_day_off: true,
        start_time: '10:00',
        end_time: '18:00',
      });
      await fetchExceptions();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to create schedule exception.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingException) return;

    setIsDeleting(true);
    try {
      const res = await scheduleApi.deleteException(deletingException.id);
      setFeedback({
        type: 'success',
        message: `${res.message}: Exception #${deletingException.id} removed.`,
      });
      setDeletingException(null);
      await fetchExceptions();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to delete exception.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Schedule Exceptions
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Override the standard weekly schedule for public holidays, special events, or individual employees.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchExceptions}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setIsCreateOpen(true);
              setFeedback(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Schedule Exception
          </button>
        </div>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Exceptions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Loading schedule exceptions...</p>
          </div>
        ) : exceptions.length === 0 ? (
          <div className="py-24 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No schedule exceptions scheduled</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All employees follow the baseline weekly schedule until an override exception is configured.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Exception Date</th>
                  <th className="py-3.5 px-6">Scope / Applies To</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Effective Shift Times</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {exceptions.map((exc) => {
                  const isCompanyWide = exc.employee_id === null;
                  return (
                    <tr key={exc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-400">#{exc.id}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{formatDate(exc.date)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {isCompanyWide ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Globe className="w-3 h-3" />
                            Company-Wide (All)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Users className="w-3 h-3" />
                            Employee #{exc.employee_id}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {exc.is_day_off ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-amber-100 text-amber-800">
                            <Coffee className="w-3 h-3" />
                            Day Off
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">
                            <Briefcase className="w-3 h-3" />
                            Special Working Shift
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-800">
                        {exc.is_day_off ? (
                          <span className="text-slate-400 italic">Off</span>
                        ) : exc.start_time && exc.end_time ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {formatTime(exc.start_time)} – {formatTime(exc.end_time)}
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => setDeletingException(exc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete exception"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Schedule Exception Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Schedule Exception"
        maxWidth="md"
      >
        <form onSubmit={handleCreateException} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Exception Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Scope <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, scope: 'all' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  formData.scope === 'all'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-4 h-4" />
                All Employees (Company-Wide)
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, scope: 'specific' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  formData.scope === 'specific'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Selected Employees
              </button>
            </div>
          </div>

          {/* If Selected Employees: input for Employee Codes */}
          {formData.scope === 'specific' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee Codes <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. EMP001, EMP002, EMP003"
                value={formData.employeeCodesInput}
                onChange={(e) =>
                  setFormData({ ...formData, employeeCodesInput: e.target.value })
                }
                className="block w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-2xs text-slate-400 mt-1">
                Enter one or more comma-separated employee codes.
              </p>
            </div>
          )}

          {/* Day Off Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
            <div>
              <p className="text-xs font-bold text-slate-900">Mark as Day Off</p>
              <p className="text-2xs text-slate-500">Enable for company holiday or off-duty exception.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_day_off}
                onChange={(e) =>
                  setFormData({ ...formData, is_day_off: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Shift Times if not Day Off */}
          {!formData.is_day_off && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Start Shift Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required={!formData.is_day_off}
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  className="block w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  End Shift Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required={!formData.is_day_off}
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  className="block w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Exception...</span>
                </>
              ) : (
                <span>Save Exception</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingException}
        onClose={() => setDeletingException(null)}
        title="Delete Schedule Exception"
        maxWidth="sm"
      >
        {deletingException && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this schedule exception for{' '}
              <strong>{formatDate(deletingException.date)}</strong>? This will restore the
              default weekly schedule for that date.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingException(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
