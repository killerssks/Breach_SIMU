import { useState } from "react";
import TerminalBox from "./TerminalBox";
import { Cpu, TerminalSquare, ScanLine, CopyPlus } from "lucide-react";

export default function RFIDSimulator() {
  const [scan, setScan] = useState(false);

  const logs = [
    "Scanning for RFID card...",
    "Card detected!",
    "Type: MIFARE Classic 1K",
    "Frequency: 13.56 MHz",
    "UID: A3:F2:8C:91",
    "Performing nested attack...",
    "Sector 0 cracked ✔",
    "Sector 1 cracked ✔",
    "Dumping data...",
    "Clone ready ✔"
  ];
  return (
    <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)] shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 mt-8">
      <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-6">
          <Cpu className="text-orange-500" size={20} />
          <h2 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-widest select-none">RFID Cloning Demonstration (Proxmark3)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* SCRIPT PANEL */}
        <div className="bg-[#030712] rounded-2xl border border-white/5 p-6 flex flex-col relative overflow-hidden shadow-inner min-h-[250px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-purple-500"></div>
          <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2 select-none">
            <TerminalSquare size={14} className="text-orange-400"/> Proxmark3 Client Stream
          </h3>
          <div className="text-xs text-orange-400 font-mono flex-1 whitespace-pre-wrap leading-relaxed">
            {scan ? <TerminalBox lines={logs} /> : <p className="text-zinc-500 italic">// Awaiting card scan command...</p>}
          </div>
        </div>

        {/* EXECUTION PANEL */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#030712] rounded-2xl border border-white/5 p-6 flex-1 flex flex-col items-center justify-center text-center shadow-inner select-none">
            <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2 w-full text-left">Clone Status</h3>
            <div className={`text-sm font-black uppercase tracking-widest ${scan ? 'text-emerald-500 animate-pulse' : 'text-zinc-500'}`}>
              {scan ? "Cloned data ready in memory..." : "Waiting..."}
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all shadow-lg flex flex-row items-center justify-center gap-2 cursor-pointer" 
              style={{ color: '#ffffff' }}
              onClick={() => setScan(true)}
            >
              <ScanLine size={14}/> Scan RFID Card
            </button>
            <button 
              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all shadow-lg flex flex-row items-center justify-center gap-2 cursor-pointer"
              style={{ color: '#ffffff' }} 
            >
              <CopyPlus size={14}/> Clone Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}