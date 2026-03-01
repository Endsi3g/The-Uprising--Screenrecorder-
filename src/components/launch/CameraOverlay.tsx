import { useEffect, useRef, useState } from 'react';

export function CameraOverlay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Failed to access camera:', err);
        setError('No Camera');
      }
    }
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div 
      className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-zinc-900 border-[3px] border-white shadow-2xl relative"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {error ? (
        <span className="text-white text-xs font-medium">{error}</span>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          // Flip video horizontally for a mirror effect & make it fill the circle
          className="w-full h-full object-cover scale-x-[-1]" 
        />
      )}
    </div>
  );
}
