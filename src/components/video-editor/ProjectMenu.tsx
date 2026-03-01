import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, FolderOpen, Save, FileDown, Plus } from 'lucide-react';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

interface ProjectMenuProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onExportVideo: () => void;
  onExportGif: () => void;
  hasUnsavedChanges: boolean;
}

export function ProjectMenu({
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  onExportVideo,
  onExportGif,
  hasUnsavedChanges
}: ProjectMenuProps) {
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new' | 'open' | null>(null);

  const handleActionWithWarning = (action: 'new' | 'open') => {
    if (hasUnsavedChanges) {
      setPendingAction(action);
      setShowUnsavedDialog(true);
    } else {
      if (action === 'new') onNewProject();
      if (action === 'open') onOpenProject();
    }
  };

  const confirmAction = () => {
    setShowUnsavedDialog(false);
    if (pendingAction === 'new') onNewProject();
    if (pendingAction === 'open') onOpenProject();
    setPendingAction(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white shrink-0">
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-[#09090b] border-white/10 text-slate-200">
          <DropdownMenuItem onClick={() => handleActionWithWarning('new')} className="hover:bg-white/10 cursor-pointer focus:bg-white/10">
            <Plus className="mr-2 h-4 w-4" />
            <span>New Project</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleActionWithWarning('open')} className="hover:bg-white/10 cursor-pointer focus:bg-white/10">
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Open Project...</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={onSaveProject} className="hover:bg-white/10 cursor-pointer focus:bg-white/10">
            <Save className="mr-2 h-4 w-4" />
            <span>Save Project</span>
            <span className="ml-auto text-xs text-slate-500 font-mono">⌘S</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveProjectAs} className="hover:bg-white/10 cursor-pointer focus:bg-white/10">
            <Save className="mr-2 h-4 w-4" />
            <span>Save Project As...</span>
            <span className="ml-auto text-xs text-slate-500 font-mono">⇧⌘S</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={onExportVideo} className="hover:bg-white/10 cursor-pointer focus:bg-white/10">
            <FileDown className="mr-2 h-4 w-4" />
            <span>Export as MP4</span>
            <span className="ml-auto text-xs text-slate-500 font-mono">⌘E</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportGif} className="hover:bg-white/10 cursor-pointer focus:bg-white/10">
            <FileDown className="mr-2 h-4 w-4" />
            <span>Export as GIF</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UnsavedChangesDialog 
        isOpen={showUnsavedDialog} 
        onClose={() => {
          setShowUnsavedDialog(false);
          setPendingAction(null);
        }} 
        onConfirm={confirmAction}
        onSaveAndConfirm={() => {
            onSaveProject();
            confirmAction();
        }}
      />
    </>
  );
}
