import { useState } from "react";
import HardwareGrid from "../components/HardwareGrid";
import HardwareDescriptions from "../components/HardwareDescriptions";
import DuckySimulator from "../components/DuckySimulator";
import RFIDSimulator from "../components/RFIDSimulator";
import { Cpu } from "lucide-react";

export default function Hardware() {
  const [activeTool, setActiveTool] = useState(null);

  return (
    <div className="p-6 md:p-8 bg-[#0a1128] min-h-screen text-slate-200 relative">
      
      {/* 🟢 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 mb-8 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Cpu className="text-[#d4af37]" size={32} />
            Hardware Diagnostics Lab
          </h1>
          <p className="text-slate-400 mt-1 text-xs">Physical intrusion vectors, signal emulation, and payload injection diagnostics.</p>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-900 border border-white/5 px-4 py-2 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase text-orange-400 tracking-wider font-mono">Lab Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <HardwareGrid onSelect={setActiveTool} activeTool={activeTool} />
          
          <div className="flex-1">
             {activeTool === "ducky" && <DuckySimulator />}
             {activeTool === "rfid" && <RFIDSimulator />}
          </div>
        </div>
        
        <div className="lg:col-span-4 h-full">
          <HardwareDescriptions active={activeTool} />
        </div>
      </div>
    </div>
  );
}