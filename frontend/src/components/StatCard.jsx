import { ArrowUpRight } from "lucide-react";

export default function StatCard({ title, value, icon, color, mini }) {
  if (mini) {
    return (
      <div className={`relative overflow-hidden p-5 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md flex items-center justify-between group hover:bg-white/10 transition-all ${color || ""}`}>
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1">{title}</p>
          <p className="text-2xl font-black text-white">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform border border-white/10 shadow-lg">
          {icon || <ArrowUpRight size={18} />}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-lg flex flex-col group hover:border-white/20 transition-all shadow-2xl hover:-translate-y-1`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${color}`}></div>
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl bg-white/5 text-white shadow-lg border border-white/10 group-hover:bg-white/10 transition-colors`}>
          {icon}
        </div>
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
          Live <ArrowUpRight size={12} />
        </span>
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">{title}</p>
        <p className="text-4xl font-black text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}