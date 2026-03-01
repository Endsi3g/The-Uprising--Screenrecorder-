import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect } from "react";
import { MdClose } from "react-icons/md";
import { Button } from "../ui/button";
import { Sparkles, Image as ImageIcon, Video, Command } from "lucide-react";
import styles from "./ChangelogDialog.module.css";

const LATEST_VERSION = "1.2.0";

export function ChangelogDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem("lastSeenChangelog");
    if (lastSeen !== LATEST_VERSION) {
      setOpen(true);
      localStorage.setItem("lastSeenChangelog", LATEST_VERSION);
    }
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white">
          <Sparkles size={14} className="mr-2 text-indigo-400" />
          What's New
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 ${styles.overlay}`} />
        <Dialog.Content className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col ${styles.content}`}>
          
          {/* Header Banner */}
          <div className="relative h-32 bg-indigo-600 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="relative z-10 text-center">
              <h2 className="text-3xl font-black text-white tracking-tight">The Uprising</h2>
              <p className="text-indigo-200 font-medium tracking-widest uppercase text-xs mt-1">Version {LATEST_VERSION}</p>
            </div>
            
            <Dialog.Close asChild>
              <button 
                className="absolute top-4 right-4 z-20 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                title="Close"
              >
                <MdClose size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar text-zinc-300 space-y-6">
            
            {/* Feature Block */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-400">
                <Video size={18} />
                <h3 className="font-bold text-lg text-white">Floating WebCam (PiP)</h3>
              </div>
              <p className="text-sm leading-relaxed">
                Add a personal touch to your recordings. Launch a seamless, transparent WebCam overlay directly from your HUD that floats above your workspace and is effortlessly captured in your final video.
              </p>
            </div>

            {/* Feature Block */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Command size={18} />
                <h3 className="font-bold text-lg text-white">AI Auto-Captions Pipeline</h3>
              </div>
              <p className="text-sm leading-relaxed">
                Our ultra-fast, browser-based Speech-to-Text engine now fully embeds caption tracks directly into your exported MP4 and GIF videos. Perfect for silent scroll-stopping content! 
              </p>
            </div>

            {/* Feature Block */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <ImageIcon size={18} />
                <h3 className="font-bold text-lg text-white">Branding & macOS Polish</h3>
              </div>
              <p className="text-sm leading-relaxed">
                Brand new official logo for The Uprising, better adaptive titlebars and traffic lights for Mac users, and improved mobile dashboard access.
              </p>
            </div>
            
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-[#121214] border-t border-white/5 flex justify-end">
            <Dialog.Close asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 rounded-full">
                Awesome!
              </Button>
            </Dialog.Close>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
