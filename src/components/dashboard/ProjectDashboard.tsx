import { 
  Plus, 
  Folder, 
  Lightbulb, 
  Download, 
  Search, 
  MoreVertical, 
  Clock, 
  Video,
  Trash2,
  Monitor,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ChangelogDialog } from '../changelog/ChangelogDialog';

// Simplified inline Badge component to avoid missing module error
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${className}`}>
    {children}
  </span>
);

interface Project {
  id: string;
  name: string;
  lastModified: number;
  videoPath: string;
  thumbnail?: string;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  links: string[];
  createdAt: number;
}

export default function ProjectDashboard({ onSelectProject, onNewProject }: { 
  onSelectProject: (path: string) => void,
  onNewProject: () => void 
}) {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileInfo, setMobileInfo] = useState<{ ip: string, port: number, url: string } | null>(null);

  useEffect(() => {
    // Load projects and ideas from localStorage
    const savedProjects = localStorage.getItem('the-screenrecorder-projects');
    const savedIdeas = localStorage.getItem('the-screenrecorder-ideas');
    
    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedIdeas) setIdeas(JSON.parse(savedIdeas));

    // Fetch mobile connection info
    if ((window.electronAPI as any)?.getMobileConnectionInfo) {
      (window.electronAPI as any).getMobileConnectionInfo().then(setMobileInfo);
    }
  }, []);

  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem('the-screenrecorder-projects', JSON.stringify(newProjects));
  };

  const saveIdeas = (newIdeas: Idea[]) => {
    setIdeas(newIdeas);
    localStorage.setItem('the-screenrecorder-ideas', JSON.stringify(newIdeas));
  };

  const handleDownload = async () => {
    if (!downloadUrl) return;
    setIsDownloading(true);
    toast.info('Starting download with yt-dlp...');
    
    try {
      const result = await window.electronAPI.downloadVideo(downloadUrl);
      if (result.success) {
        toast.success('Download complete!');
        setDownloadUrl('');
        // Logic to refresh ideas/videos could go here
      } else {
        toast.error(`Download failed: ${result.message}`);
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('An unexpected error occurred during download');
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#0F0F0F] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-[#262626] bg-[#141414] flex flex-col">
        <div className="p-6 border-b border-[#262626]">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Monitor className="text-[#3B82F6] w-6 h-6" />
            <span>The Screenrecorder</span>
          </h1>
        </div>
        
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="px-3 space-y-1">
            <Button 
              variant={activeTab === 'projects' ? 'secondary' : 'ghost'} 
              className={`w-full justify-start gap-3 ${activeTab === 'projects' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setActiveTab('projects')}
            >
              <Folder size={18} />
              <span>Projects</span>
            </Button>
            <Button 
              variant={activeTab === 'ideas' ? 'secondary' : 'ghost'} 
              className={`w-full justify-start gap-3 ${activeTab === 'ideas' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setActiveTab('ideas')}
            >
              <Lightbulb size={18} />
              <span>Ideas & Notes</span>
            </Button>
            <Button 
              variant={activeTab === 'downloads' ? 'secondary' : 'ghost'} 
              className={`w-full justify-start gap-3 ${activeTab === 'downloads' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setActiveTab('downloads')}
            >
              <Download size={18} />
              <span>Video Downloader</span>
            </Button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#262626] space-y-2">
          {mobileInfo && (
            <div className="bg-[#10B981]/10 p-3 rounded-lg border border-[#10B981]/20">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="text-[#10B981] w-3.5 h-3.5" />
                <p className="text-[10px] text-[#10B981] font-bold uppercase tracking-wider">Mobile Access</p>
              </div>
              <p className="text-[11px] text-gray-300 font-mono select-all">
                {mobileInfo.url}
              </p>
            </div>
          )}
          <div className="bg-[#3B82F6]/10 p-3 rounded-lg border border-[#3B82F6]/20">
            <p className="text-xs text-[#3B82F6] font-semibold mb-1">PRO TIP</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Use Ctrl+S to quickly save your project progress.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#262626] bg-[#141414] flex items-center justify-between px-8">
          <div className="relative w-96 font-sans">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input 
              placeholder="Search projects, ideas..." 
              className="bg-[#1A1A1A] border-[#262626] pl-10 h-9 text-sm focus-visible:ring-[#3B82F6]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <ChangelogDialog />
            <Button onClick={onNewProject} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white gap-2 h-9 px-4 font-sans font-medium text-sm rounded-md transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Plus size={16} />
              <span>New Project</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 font-sans">
          {activeTab === 'projects' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Recent Projects</h2>
                  <p className="text-sm text-gray-400">Manage and edit your screen recordings</p>
                </div>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[#262626] rounded-xl bg-[#141414]/50">
                  <Video className="w-12 h-12 text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-300">No projects found</h3>
                  <p className="text-sm text-gray-500 mb-6">Start by creating a new recording or importing a video.</p>
                  <Button onClick={onNewProject} variant="outline" className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-md">
                    Create your first project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProjects.map((project) => (
                    <Card key={project.id} className="bg-[#141414] border-[#262626] hover:border-[#3B82F6]/50 transition-all cursor-pointer group shadow-lg">
                      <div className="aspect-video bg-[#0A0A0A] rounded-t-lg relative overflow-hidden flex items-center justify-center">
                        {project.thumbnail ? (
                          <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <Video className="w-10 h-10 text-[#3B82F6]/30 group-hover:text-[#3B82F6]/60 transition-colors" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" className="bg-[#3B82F6] text-white hover:bg-[#2563EB] scale-90 group-hover:scale-100 transition-transform" 
                            onClick={() => onSelectProject(project.videoPath)}>
                            Open Project
                          </Button>
                        </div>
                      </div>
                      <CardHeader className="p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold truncate text-gray-100">{project.name}</CardTitle>
                          <MoreVertical size={14} className="text-gray-500 hover:text-white" />
                        </div>
                        <CardDescription className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(project.lastModified).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ideas' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div>
                <h2 className="text-2xl font-bold text-white mb-1">Ideas & Notes</h2>
                <p className="text-sm text-gray-400">Brainstorm your next viral video</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#141414] border-[#262626]">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                      <Plus className="text-[#3B82F6]" size={18} />
                      <span>Quick Note</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Idea title..." className="bg-[#1A1A1A] border-[#262626] focus-visible:ring-[#3B82F6]" />
                    <textarea 
                      className="w-full h-32 bg-[#1A1A1A] border border-[#262626] rounded-md p-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] resize-none"
                      placeholder="Write your thoughts here..."
                    ></textarea>
                    <Button className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-md h-9">Save Idea</Button>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {ideas.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 bg-[#141414]/50 border border-dashed border-[#262626] rounded-xl">
                      <Lightbulb className="w-8 h-8 text-gray-600 mb-3" />
                      <p className="text-sm text-gray-500 text-center">Your ideas list is empty.</p>
                    </div>
                  ) : (
                    ideas.map(idea => (
                      <Card key={idea.id} className="bg-[#141414] border-[#262626] hover:border-[#3B82F6]/30 transition-colors shadow-sm">
                        <CardHeader className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base text-gray-100">{idea.title}</CardTitle>
                              <CardDescription className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {idea.description}
                              </CardDescription>
                            </div>
                            <Badge className={
                              idea.status === 'todo' ? 'bg-gray-800 text-gray-400' : 
                              idea.status === 'in-progress' ? 'bg-blue-900/30 text-[#3B82F6]' : 
                              'bg-green-900/30 text-green-500'
                            }>
                              {idea.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardFooter className="p-4 pt-0 flex gap-2">
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400 hover:text-white px-2">
                            <Trash2 size={14} className="mr-1" /> Delete
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400 hover:text-white px-2">
                            <Plus size={14} className="mr-1" /> Add Reference
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'downloads' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#3B82F6]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#3B82F6]/20">
                  <Download className="text-[#3B82F6] w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Video Downloader</h2>
                <p className="text-sm text-gray-400">Download videos from YouTube or Instagram directly into your ideas</p>
              </div>

              <Card className="bg-[#141414] border-[#262626] p-1 shadow-2xl">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Video URL</label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
                           <Youtube size={16} className="text-red-500" />
                           <Instagram size={16} className="text-pink-500" />
                         </div>
                        <Input 
                          placeholder="Paste link here..." 
                          className="bg-[#1A1A1A] border-[#262626] pl-14 h-11 focus-visible:ring-[#3B82F6] text-gray-100"
                          value={downloadUrl}
                          onChange={(e) => setDownloadUrl(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleDownload} 
                        disabled={!downloadUrl || isDownloading}
                        className="bg-[#3B82F6] hover:bg-[#2563EB] h-11 px-8 rounded-md font-semibold transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                      >
                        {isDownloading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Downloading...</span>
                          </div>
                        ) : (
                          'Download'
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-[#1A1A1A] border border-[#262626] rounded-xl flex items-center gap-4 group hover:border-[#3B82F6]/30 transition-colors">
                      <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500">
                        <Youtube size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">YouTube</p>
                        <p className="text-[11px] text-gray-500">4K/HD Support</p>
                      </div>
                    </div>
                    <div className="p-4 bg-[#1A1A1A] border border-[#262626] rounded-xl flex items-center gap-4 group hover:border-[#3B82F6]/30 transition-colors">
                      <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center text-pink-500">
                        <Instagram size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">Instagram</p>
                        <p className="text-[11px] text-gray-500">Reels & Posts</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col items-center gap-2 pt-4">
                <p className="text-xs text-gray-500 italic">Downloads are powered by yt-dlp - keep it open source.</p>
                <div className="flex gap-4 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
                  <span className="text-[10px] uppercase tracking-tighter border border-gray-700 px-2 py-0.5 rounded">MP4</span>
                  <span className="text-[10px] uppercase tracking-tighter border border-gray-700 px-2 py-0.5 rounded">WEBM</span>
                  <span className="text-[10px] uppercase tracking-tighter border border-gray-700 px-2 py-0.5 rounded">MKV</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
