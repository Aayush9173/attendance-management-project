import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import type { CompanySettingsPayload } from '../../types';
import { Alert } from '../../components/Alert';
import {
  MapPin,
  Save,
  Navigation,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Info,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [radiusMeters, setRadiusMeters] = useState<string>('100');
  const [verificationEnabled, setVerificationEnabled] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAcquiringGps, setIsAcquiringGps] = useState<boolean>(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await adminApi.getCompanySettings();
      setLatitude(String(data.latitude));
      setLongitude(String(data.longitude));
      setRadiusMeters(String(data.attendance_radius_meters));
      setVerificationEnabled(data.location_verification_enabled);
      setIsFirstTimeSetup(false);
    } catch (err: any) {
      // 404 means settings have not yet been configured on the backend
      if (err?.status === 404) {
        setIsFirstTimeSetup(true);
        setLatitude('');
        setLongitude('');
        setRadiusMeters('100');
        setVerificationEnabled(false);
      } else {
        setFeedback({
          type: 'error',
          message: err?.message || 'Failed to load company attendance settings.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Acquire admin's current browser location to populate office coordinates
  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setFeedback({
        type: 'warning',
        message: 'Geolocation is not supported by your current browser.',
      });
      return;
    }

    setIsAcquiringGps(true);
    setFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lon, accuracy } = position.coords;
        setLatitude(lat.toFixed(6));
        setLongitude(lon.toFixed(6));
        setIsAcquiringGps(false);
        setFeedback({
          type: 'info',
          message: `Browser coordinates captured (accuracy: ±${Math.round(
            accuracy
          )}m). Please review the office coordinates before saving.`,
        });
      },
      (error) => {
        setIsAcquiringGps(false);
        let errorMsg = 'Unable to retrieve your current location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied by your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable on your device.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location acquisition timed out. Please try again or enter manually.';
        }
        setFeedback({
          type: 'warning',
          message: errorMsg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const latNum = parseFloat(latitude.trim());
    const lonNum = parseFloat(longitude.trim());
    const radiusNum = parseFloat(radiusMeters.trim());

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setFeedback({
        type: 'error',
        message: 'Latitude must be a valid number between -90 and 90.',
      });
      return;
    }

    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setFeedback({
        type: 'error',
        message: 'Longitude must be a valid number between -180 and 180.',
      });
      return;
    }

    if (isNaN(radiusNum) || radiusNum <= 0) {
      setFeedback({
        type: 'error',
        message: 'Attendance radius must be a positive number greater than 0 metres.',
      });
      return;
    }

    const payload: CompanySettingsPayload = {
      latitude: latNum,
      longitude: lonNum,
      attendance_radius_meters: radiusNum,
      location_verification_enabled: verificationEnabled,
    };

    setIsSubmitting(true);
    try {
      const updated = await adminApi.updateCompanySettings(payload);
      setLatitude(String(updated.latitude));
      setLongitude(String(updated.longitude));
      setRadiusMeters(String(updated.attendance_radius_meters));
      setVerificationEnabled(updated.location_verification_enabled);
      setIsFirstTimeSetup(false);
      setFeedback({
        type: 'success',
        message: 'Company attendance and geofencing settings saved successfully.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to save company settings.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Company Location &amp; Geofencing
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure your office coordinates and attendance radius to enforce physical presence during punch-in.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Settings
        </button>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Initial Configuration Notice when 404 */}
      {isFirstTimeSetup && !isLoading && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex items-start gap-3 text-xs text-amber-900">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Initial Setup Required</p>
            <p className="mt-0.5 text-amber-800">
              No company settings record exists yet. Please configure the primary office location coordinates and permitted attendance radius below to initialize geofencing for your organization.
            </p>
          </div>
        </div>
      )}

      {/* Settings Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Loading company settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            {/* Geofencing Status Toggle Banner */}
            <div
              className={`p-5 rounded-xl border transition-colors flex items-center justify-between ${
                verificationEnabled
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    verificationEnabled
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {verificationEnabled ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Location Verification
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {verificationEnabled
                      ? 'Active: Employees must be within permitted radius to check in and out.'
                      : 'Disabled: Employees can record attendance without GPS location checks.'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={verificationEnabled}
                  onChange={(e) => setVerificationEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Coordinates Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Office Coordinates
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Specify the authoritative GPS center of your workplace.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isAcquiringGps || isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                  title="Detect coordinates from administrator's browser location"
                >
                  {isAcquiringGps ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Use My Current Location</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Latitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 28.613939"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    disabled={isSubmitting}
                    className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-2xs text-slate-400 mt-1">Decimal degrees between -90 and 90</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Longitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 77.209021"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    disabled={isSubmitting}
                    className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-2xs text-slate-400 mt-1">Decimal degrees between -180 and 180</p>
                </div>
              </div>
            </div>

            {/* Attendance Radius Section */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Permitted Attendance Radius (Metres) <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-xs max-w-xs">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="100"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  disabled={isSubmitting}
                  className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs text-slate-400 font-medium">
                  metres
                </div>
              </div>
              <p className="text-2xs text-slate-400">
                Default is 100 metres. Employees punching beyond this radius will receive a location verification error.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Company Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};