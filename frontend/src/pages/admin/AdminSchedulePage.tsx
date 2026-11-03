import React, { useState, useEffect, useCallback } from 'react';
import { scheduleApi } from '../../api/schedule';
import type { DefaultSchedule, CreateDefaultSchedulePayload } from '../../types';
import { Alert } from '../../components/Alert';
import { Modal } from '../../components/Modal';
import { formatTime, formatWeekday, WEEKDAYS } from '../../utils/formatters';
import {
  Clock,
  Edit2,
  RefreshCw,
  Loader2,
  Coffee,
  Briefcase,
} from 'lucide-react';

export const AdminSchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<DefaultSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Edit / Upsert Modal
  const [editingSchedule, setEditingSchedule] = useState<{
    weekday: number;
    start_time: string;
    end_time: string;
    is_day_off: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setFeedback(null);
    try {
      const data = await scheduleApi.getDefaultSchedules();
      setSchedules(data);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to load default schedules.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Open modal for a specific weekday
  const handleOpenEdit = (weekday: number) => {
    const existing = schedules.find((s) => s.weekday === weekday);
    if (existing) {
      setEditingSchedule({
        weekday: existing.weekday,
        start_time: existing.start_time ? existing.start_time.slice(0, 5) : '09:00',
        end_time: existing.end_time ? existing.end_time.slice(0, 5) : '18:00',
        is_day_off: existing.is_day_off,
      });
    } else {
      // Default to 09:00 - 18:00 for working day or off for Sunday (7)
      setEditingSchedule({
        weekday,
        start_time: weekday === 7 ? '' : '09:00',
        end_time: weekday === 7 ? '' : '18:00',
        is_day_off: weekday === 7,
      });
    }
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    // Validate rules
    if (editingSchedule.is_day_off) {
      // Day off must not have start/end times
    } else {
      if (!editingSchedule.start_time || !editingSchedule.end_time) {
        setFeedback({ type: 'error', message: 'Working days require both start and end times.' });
        return;
      }
      if (editingSchedule.start_time >= editingSchedule.end_time) {
        setFeedback({ type: 'error', message: 'Start time must be strictly before end time.' });
        return;
      }
    }

    const payload: CreateDefaultSchedulePayload = {
      weekday: editingSchedule.weekday,
      start_time: editingSchedule.is_day_off ? null : `${editingSchedule.start_time}:00`,
      end_time: editingSchedule.is_day_off ? null : `${editingSchedule.end_time}:00`,
      is_day_off: editingSchedule.is_day_off,
    };

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await scheduleApi.saveDefaultSchedule(payload);
      setFeedback({
        type: 'success',
        message: `Schedule for ${formatWeekday(editingSchedule.weekday)} saved successfully.`,
      });
      setEditingSchedule(null);
      await fetchSchedules();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to update schedule.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Default Weekly Schedules
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Establish baseline business hours and recurring weekly off days for Monday through Sunday.
          </p>
        </div>
        <button
          onClick={fetchSchedules}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Weekday Cards Grid */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading weekly schedules...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
            const sched = schedules.find((s) => s.weekday === dayNum);
            const isDayOff = sched ? sched.is_day_off : dayNum === 7;
            const hasRecord = !!sched;

            return (
              <div
                key={dayNum}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                  isDayOff
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Day {dayNum}
                    </span>
                    {isDayOff ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Coffee className="w-3 h-3" />
                        Day Off
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Briefcase className="w-3 h-3" />
                        Work Day
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-3">
                    {WEEKDAYS[dayNum]}
                  </h3>

                  <div className="space-y-2 text-xs py-2 border-t border-slate-100">
                    {isDayOff ? (
                      <p className="text-slate-500 italic">No working hours scheduled.</p>
                    ) : sched?.start_time && sched?.end_time ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {formatTime(sched.start_time)} – {formatTime(sched.end_time)}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-400 font-medium">Standard Working Shift</p>
                      </div>
                    ) : (
                      <p className="text-slate-400">Not configured yet.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(dayNum)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{hasRecord ? 'Edit Schedule' : 'Set Schedule'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Upsert Schedule Modal */}
      <Modal
        isOpen={!!editingSchedule}
        onClose={() => setEditingSchedule(null)}
        title={editingSchedule ? `Configure Schedule: ${WEEKDAYS[editingSchedule.weekday]}` : 'Configure Schedule'}
        maxWidth="md"
      >
        {editingSchedule && (
          <form onSubmit={handleSubmitSchedule} className="space-y-5">
            {/* Day Off Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div>
                <p className="text-xs font-bold text-slate-900">Mark as Day Off</p>
                <p className="text-2xs text-slate-500">Toggle on if employees are off on this weekday.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingSchedule.is_day_off}
                  onChange={(e) =>
                    setEditingSchedule({
                      ...editingSchedule,
                      is_day_off: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Shift Times */}
            {!editingSchedule.is_day_off && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Shift Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required={!editingSchedule.is_day_off}
                    value={editingSchedule.start_time}
                    onChange={(e) =>
                      setEditingSchedule({ ...editingSchedule, start_time: e.target.value })
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
                    required={!editingSchedule.is_day_off}
                    value={editingSchedule.end_time}
                    onChange={(e) =>
                      setEditingSchedule({ ...editingSchedule, end_time: e.target.value })
                    }
                    className="block w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSchedule(null)}
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
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Schedule</span>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
