import { Redo2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatShortcut } from "@/utils/platformUtils";

interface UndoRedoControlsProps {
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
}

export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) {
	const [undoShortcut, setUndoShortcut] = useState("Ctrl+Z");
	const [redoShortcut, setRedoShortcut] = useState("Ctrl+Shift+Z");

	useEffect(() => {
		formatShortcut(["mod", "Z"]).then(setUndoShortcut);
		formatShortcut(["mod", "shift", "Z"]).then(setRedoShortcut);
	}, []);

	return (
		<TooltipProvider>
			<div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-0.5 border border-white/5">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={onUndo}
							disabled={!canUndo}
							className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
						>
							<Undo2 className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="text-xs bg-[#2a2a2a] border-white/10">
						<p>
							Undo <kbd className="ml-1 px-1.5 py-0.5 bg-white/10 rounded">{undoShortcut}</kbd>
						</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={onRedo}
							disabled={!canRedo}
							className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
						>
							<Redo2 className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="text-xs bg-[#2a2a2a] border-white/10">
						<p>
							Redo <kbd className="ml-1 px-1.5 py-0.5 bg-white/10 rounded">{redoShortcut}</kbd>
						</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}
