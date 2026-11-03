import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceApi } from '../../api/attendance';
import type { AttendanceRecord, LocationCoordinates } from '../../types';
import { PhotoUploader } from '../../components/PhotoUploader';
import { Alert } from '../../components/Alert';
import { StatusBadge } from '../../components/StatusBadge';
import { formatTime, formatDate, calculateHoursWorked } from '../../utils/formatters';
import {
  Clock,
  CheckCircle2,
  Calendar,
  LogIn,
  LogOut,
  Loader2,
  RefreshCw,
  History,
  ShieldCheck,
} from 'lucide-react';

interface EmployeeDashboardProps {
  onNavigateHistory?: () => void;
}

function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentLocation(): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = 'Failed to acquire your location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access to record attendance.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable on your device.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location acquisition timed out. Please check your GPS signal and try again.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onNavigateHistory }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocationVerificationEnabled, setIsLocationVerificationEnabled] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = getTodayDateStr();

  const fetchAttendance = useCallback(async () => {
    try {
      const [attData, geofenceStatus] = await Promise.all([
        attendanceApi.getMyAttendance(),
        attendanceApi.getGeofenceStatus().catch(() => ({ location_verification_enabled: false })),
      ]);

      const sorted = [...attData].sort(
        (a, b) => new Date(b.mark_date).getTime() - new Date(a.mark_date).getTime()
      );
      setRecords(sorted);
      setIsLocationVerificationEnabled(geofenceStatus.location_verification_enabled);
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
    fetchAttendance();
  }, [fetchAttendance]);

  // Determine today's record
  const todayRecord = records.find((r) => r.mark_date === todayStr);

  const isCheckedIn = !!todayRecord?.check_in;
  const isCheckedOut = !!todayRecord?.check_out;

  const handleCheckIn = async () => {
    if (!selectedPhoto) {
      setFeedback({ type: 'error', message: 'Please upload or capture a photo before checking in.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    let locationData: LocationCoordinates | undefined = undefined;
    if (isLocationVerificationEnabled) {
      try {
        locationData = await getCurrentLocation();
      } catch (geoErr: any) {
        setFeedback({
          type: 'error',
          message: geoErr?.message || 'Location verification is required but your location could not be determined.',
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const res = await attendanceApi.checkIn(selectedPhoto, locationData);
      setFeedback({
        type: 'success',
        message: `${res.message} Checked in at ${formatTime(res.check_in)}.`,
      });
      setSelectedPhoto(null);
      await fetchAttendance();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Check-in failed. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedPhoto) {
      setFeedback({ type: 'error', message: 'Please upload or capture a photo before checking out.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    let locationData: LocationCoordinates | undefined = undefined;
    if (isLocationVerificationEnabled) {
      try {
        locationData = await getCurrentLocation();
      } catch (geoErr: any) {
        setFeedback({
          type: 'error',
          message: geoErr?.message || 'Location verification is required but your location could not be determined.',
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const res = await attendanceApi.checkOut(selectedPhoto, locationData);
      setFeedback({
        type: 'success',
        message: `${res.message} Checked out at ${formatTime(res.check_out || res.check_in)}.`,
      });
      setSelectedPhoto(null);
      await fetchAttendance();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Check-out failed. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner & Live Clock */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            Employee Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            Welcome back, {user?.username}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Record your daily check-in and checkout verification seamlessly.
          </p>
        </div>

        {/* Live Clock Card */}
        <div className="bg-slate-900 text-white rounded-xl p-5 sm:min-w-[240px] text-center sm:text-right shadow-md">
          <div className="flex items-center justify-center sm:justify-end gap-2 text-indigo-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Live System Time</span>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight mt-1 text-slate-100">
            {currentTime.toLocaleTimeString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {currentTime.toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Main Today's Attendance Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Today&apos;s Attendance Status</h2>
            {isLocationVerificationEnabled && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Geofence Active
              </span>
            )}
          </div>
          <button
            onClick={fetchAttendance}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Checking today&apos;s status...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Status overview and timestamps */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Current State</span>
                    {isCheckedOut ? (
                      <StatusBadge status="completed" label="Completed Today" />
                    ) : isCheckedIn ? (
                      <StatusBadge status="checked_in" label="Checked In" />
                    ) : (
                      <StatusBadge status="not_checked_in" label="Not Checked In" />
                    )}
                  </div>

                  {/* Timestamps Card */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between py-2 border-b border-slate-200/80 text-sm">
                      <span className="text-slate-500 flex items-center gap-2">
                        <LogIn className="w-4 h-4 text-emerald-600" />
                        Check-in Time
                      </span>
                      <span className="font-semibold text-slate-900">
                        {isCheckedIn ? formatTime(todayRecord?.check_in) : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 text-sm">
                      <span className="text-slate-500 flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-indigo-600" />
                        Check-out Time
                      </span>
                      <span className="font-semibold text-slate-900">
                        {isCheckedOut ? formatTime(todayRecord?.check_out) : '—'}
                      </span>
                    </div>

                    {isCheckedIn && isCheckedOut && (
                      <div className="flex items-center justify-between py-2 border-t border-slate-200/80 text-sm">
                        <span className="text-slate-500 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          Hours Worked
                        </span>
                        <span className="font-bold text-indigo-700">
                          {calculateHoursWorked(todayRecord?.check_in, todayRecord?.check_out)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Helpful status hint */}
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                  {!isCheckedIn && (
                    <p>
                      <strong>Step 1:</strong> Capture your verification photo with the camera and click <strong>Submit Today&apos;s Check-In</strong>.
                    </p>
                  )}
                  {isCheckedIn && !isCheckedOut && (
                    <p>
                      <strong>Step 2:</strong> You are currently checked in. At the end of your shift, capture your checkout photo and click <strong>Submit Today&apos;s Check-Out</strong>.
                    </p>
                  )}
                  {isCheckedOut && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p>
                        Your attendance record for today is complete! Both check-in and check-out have been successfully recorded.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Photo capture and Action controls */}
              <div className="lg:col-span-7">
                {!isCheckedIn ? (
                  /* Action: Check In */
                  <div className="space-y-5">
                    <PhotoUploader
                      label="Capture check-in verification photo"
                      selectedFile={selectedPhoto}
                      onPhotoSelected={setSelectedPhoto}
                      disabled={isSubmitting}
                    />

                    <button
                      type="button"
                      onClick={handleCheckIn}
                      disabled={!selectedPhoto || isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Registering Check-in...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Submit Today&apos;s Check-In</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : !isCheckedOut ? (
                  /* Action: Check Out */
                  <div className="space-y-5">
                    <PhotoUploader
                      label="Capture check-out verification photo"
                      selectedFile={selectedPhoto}
                      onPhotoSelected={setSelectedPhoto}
                      disabled={isSubmitting}
                    />

                    <button
                      type="button"
                      onClick={handleCheckOut}
                      disabled={!selectedPhoto || isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Recording Check-out...</span>
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4" />
                          <span>Submit Today&apos;s Check-Out</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Already Completed */
                  <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-8 text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-emerald-950">Shift Finished</h3>
                    <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                      You have already submitted both check-in and checkout for today. No further action is required until your next scheduled work day.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Attendance Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Recent Attendance Records</h3>
          </div>
          {onNavigateHistory && (
            <button
              onClick={onNavigateHistory}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              View Full History &rarr;
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {records.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No previous attendance records found.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Check-in</th>
                  <th className="py-3 px-6">Check-out</th>
                  <th className="py-3 px-6">Hours Worked</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.slice(0, 5).map((rec) => {
                  const isDone = !!rec.check_out;
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        {formatDate(rec.mark_date)}
                      </td>
                      <td className="py-3.5 px-6 font-medium">
                        {formatTime(rec.check_in)}
                      </td>
                      <td className="py-3.5 px-6 font-medium">
                        {formatTime(rec.check_out)}
                      </td>
                      <td className="py-3.5 px-6 font-medium text-slate-700">
                        {calculateHoursWorked(rec.check_in, rec.check_out)}
                      </td>
                      <td className="py-3.5 px-6">
                        {isDone ? (
                          <StatusBadge status="completed" />
                        ) : (
                          <StatusBadge status="missing_checkout" />
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
    </div>
  );
};
