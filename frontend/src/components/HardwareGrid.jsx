import { Usb, Wifi, Radio, Key, ShieldAlert, Cpu } from "lucide-react";

export default function HardwareGrid({ onSelect, activeTool }) {
  const tools = [
    { name: "USB Rubber Ducky", desc: "HID Attack Device", id: "ducky", icon: Usb },
    { name: "WiFi Deauther", desc: "ESP8266 Based", id: "wifi", icon: Wifi },
    { name: "Flipper Zero", desc: "Multi-Protocol Tool", id: "flipper", icon: Radio },
    { name: "Proxmark3", desc: "RFID Cloner", id: "rfid", icon: Cpu },
    { name: "Evil Portal", desc: "Captive Portal Attack", id: "portal", icon: ShieldAlert },
    { name: "Hardware Keylogger", desc: "PS/2 + USB", id: "keylogger", icon: Key }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {tools.map(tool => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <div
            key={tool.id}
            onClick={() => onSelect(tool.id)}
            className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 group backdrop-blur-xl ${
              isActive 
                ? "bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] transform scale-[1.02]" 
                : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10"
            }`}
          >
            <div className={`mb-6 flex justify-between items-start transition-colors duration-300 ${isActive ? "text-orange-400" : "text-gray-400 group-hover:text-white"}`}>
              <Icon size={36} />
              {isActive && (
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#f97316]"></span>
              )}
            </div>
            <h3 className={`text-lg font-black tracking-tight mb-1 text-[var(--text-primary)]`}>{tool.name}</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{tool.desc}</p>
          </div>
        );
      })}
    </div>
  );
}