import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface UnsavedChangesDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	onSaveAndConfirm: () => void;
}

export function UnsavedChangesDialog({
	isOpen,
	onClose,
	onConfirm,
	onSaveAndConfirm,
}: UnsavedChangesDialogProps) {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[425px] bg-[#09090b] border border-white/10 text-white">
				<DialogHeader>
					<DialogTitle>Unsaved Changes</DialogTitle>
					<DialogDescription className="text-slate-400">
						You have unsaved changes in your current project. Do you want to save them before
						proceeding?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex flex-row justify-end space-x-2 sm:space-x-2 mt-4">
					<Button
						variant="outline"
						onClick={onClose}
						className="border-white/10 hover:bg-white/10 text-white"
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
					>
						Don't Save
					</Button>
					<Button
						onClick={onSaveAndConfirm}
						className="bg-[#3B82F6] text-black hover:bg-[#3B82F6]/90"
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
