import { useEffect, useState } from "react";
import { LaunchWindow } from "./components/launch/LaunchWindow";
import { SourceSelector } from "./components/launch/SourceSelector";
import { CameraOverlay } from "./components/launch/CameraOverlay";
import ProjectDashboard from "./components/dashboard/ProjectDashboard";
import VideoEditor from "./components/video-editor/VideoEditor";
import { loadAllCustomFonts } from "./lib/customFonts";

export default function App() {
  const [windowType, setWindowType] = useState('');
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [selectedVideoPath, setSelectedVideoPath] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('windowType') || '';
    setWindowType(type);
    
    // Auto-switch to editor if videoPath is provided (e.g. from command line or recent files)
    const videoPath = params.get('videoPath');
    if (videoPath) {
      setSelectedVideoPath(videoPath);
      setView('editor');
    }

    if (type === 'hud-overlay' || type === 'source-selector') {
      document.body.style.background = 'transparent';
      document.documentElement.style.background = 'transparent';
      document.getElementById('root')?.style.setProperty('background', 'transparent');
    }

    // Load custom fonts on app initialization
    loadAllCustomFonts().catch((error) => {
      console.error('Failed to load custom fonts:', error);
    });
  }, []);

  const handleSelectProject = (path: string) => {
    setSelectedVideoPath(path);
    setView('editor');
  };

  const handleNewProject = () => {
    setSelectedVideoPath(null);
    setView('editor');
  };

  switch (windowType) {
    case 'hud-overlay':
      return <LaunchWindow />;
    case 'source-selector':
      return <SourceSelector />;
    case 'camera-overlay':
      return <CameraOverlay />;
    case 'editor':
      if (view === 'dashboard') {
        return <ProjectDashboard onSelectProject={handleSelectProject} onNewProject={handleNewProject} />;
      }
      return <VideoEditor initialVideoPath={selectedVideoPath} onBackToDashboard={() => setView('dashboard')} />;
    default:
      return (
        <div className="w-full h-full bg-[#0F0F0F] text-foreground flex items-center justify-center">
          <ProjectDashboard onSelectProject={handleSelectProject} onNewProject={handleNewProject} />
        </div>
      );
  }
}
