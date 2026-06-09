"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { ProjectChat } from "./project-chat";

/** Header button that opens the project chat in a modal (chat is a tool, not the page). */
export function ProjectAssistant({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-500">
        <Sparkles size={14} /> Ask AI
      </button>

      {open && (
        // No backdrop-click-to-close — only the X closes it (don't lose the chat by misclicking).
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_120ms_ease-out]">
          <div className="w-full max-w-5xl animate-[scaleIn_140ms_ease-out]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/80 inline-flex items-center gap-1.5"><Sparkles size={13} /> Project assistant</span>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <ProjectChat projectId={projectId} />
          </div>
        </div>
      )}
    </>
  );
}
