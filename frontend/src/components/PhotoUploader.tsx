import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X, Check, Loader2, AlertCircle, Video } from 'lucide-react';

interface PhotoUploaderProps {
  onPhotoSelected: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
  label?: string;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onPhotoSelected,
  selectedFile,
  disabled = false,
  label = 'Attendance verification camera capture',
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream tracks helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore error on stop
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsLoadingCamera(false);
  }, []);

  // Cleanup stream and preview URL on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [stopCameraStream, previewUrl]);

  // Keep previewUrl in sync if external selectedFile is cleared
  useEffect(() => {
    if (!selectedFile && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [selectedFile, previewUrl]);

  // Start Camera
  const startCamera = async () => {
    setError(null);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setError(
        'Camera access is not supported by your browser or environment. A secure connection (HTTPS or localhost) and a modern browser are required.'
      );
      return;
    }

    // Clear any previous captured photo
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onPhotoSelected(null);

    setIsLoadingCamera(true);
    try {
      let stream: MediaStream;
      try {
        // Prefer user-facing front camera with good resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback to basic video constraint if facingMode is unsupported
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setIsLoadingCamera(false);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setIsLoadingCamera(false);
      setIsCameraActive(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Please allow camera access in your browser settings to verify your attendance.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setError('No camera device was detected on your system. A working camera is required to check in/out.');
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setError('Your camera is currently in use by another application. Please close other camera apps and try again.');
      } else {
        setError(err?.message || 'Failed to start camera. Please verify device permissions and try again.');
      }
    }
  };

  // Attach stream when video element renders
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Capture Photo from Video to Canvas and File
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Failed to process camera snapshot. Please try capturing again.');
          return;
        }

        const fileName = `attendance_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const newUrl = URL.createObjectURL(blob);

        setPreviewUrl(newUrl);
        onPhotoSelected(file);
        stopCameraStream();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetake = () => {
    startCamera();
  };

  const handleClearPhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    onPhotoSelected(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-800">
          {label} <span className="text-rose-500">*</span>
        </label>
        {selectedFile && (
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Photo verified &amp; ready
          </span>
        )}
      </div>

      {/* Hidden canvas used exclusively for frame rasterization */}
      <canvas ref={canvasRef} className="hidden" />

      {/* State 1: Active Live Camera Preview */}
      {isCameraActive ? (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shadow-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-72 sm:h-80 object-cover object-center -scale-x-100"
          />

          {/* Live Recording Indicator */}
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-full text-2xs font-semibold text-white border border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            LIVE CAMERA
          </div>

          {/* Camera Action Overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={stopCameraStream}
              disabled={disabled}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-600 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>

            <button
              type="button"
              onClick={capturePhoto}
              disabled={disabled}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Capture Photo
            </button>
          </div>
        </div>
      ) : previewUrl && selectedFile ? (
        /* State 2: Captured Photo Preview */
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm">
          <img
            src={previewUrl}
            alt="Attendance photo verification preview"
            className="w-full h-72 sm:h-80 object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent flex items-end justify-between p-4">
            <div className="text-white text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-2xs border border-emerald-500/30 mb-1">
                <Check className="w-3 h-3" /> Captured from Camera
              </span>
              <p className="font-semibold text-slate-100">{selectedFile.name}</p>
              <p className="text-slate-400 text-2xs font-mono">
                {(selectedFile.size / 1024).toFixed(1)} KB &bull; Real-time photo
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                title="Retake photo"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake
              </button>
              <button
                type="button"
                onClick={handleClearPhoto}
                disabled={disabled}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* State 3: Empty State - Camera Prompt (No file upload) */
        <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 bg-slate-50/70 rounded-2xl p-6 sm:p-8 transition-colors text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Video className="w-7 h-7" />
          </div>

          <h3 className="text-sm font-bold text-slate-900">
            Real-time Camera Verification
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            To ensure genuine attendance logging, check-in and check-out require a live photo capture from your device camera.
          </p>

          <button
            type="button"
            onClick={startCamera}
            disabled={disabled || isLoadingCamera}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {isLoadingCamera ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Starting Camera...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Open Camera &amp; Take Photo</span>
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
