import { ShieldAlert, Info } from "lucide-react";

export default function HardwareDescriptions({ active }) {
  const tools = {
    ducky: {
      title: "USB Rubber Ducky",
      price: "$60 USD",
      description: `Disguises as a USB keyboard (HID device). When plugged in, the system trusts it instantly and executes keystrokes at high speed. It can open command prompts, download payloads, and establish reverse shells within seconds.`,
      defense: `Disable AutoRun, enforce USB device whitelisting, monitor abnormal keystroke injection using EDR solutions, and restrict physical access.`
    },
    rfid: {
      title: "Proxmark3",
      price: "RFID Cloner",
      description: `Advanced RFID research tool used to read, analyze, and clone RFID cards. It can perform attacks such as nested authentication to recover encryption keys from vulnerable cards like MIFARE Classic.`,
      defense: `Use secure RFID cards like MIFARE DESFire or iCLASS SEOS, deploy RFID-blocking sleeves, and monitor access patterns.`
    },
    wifi: {
      title: "WiFi Deauther",
      price: "ESP8266",
      description: `Performs deauthentication attacks by sending forged packets to disconnect devices from WiFi networks. Often used to test wireless resilience and denial-of-service scenarios.`,
      defense: `Enable WPA3, monitor abnormal deauth traffic, and deploy Wireless Intrusion Detection Systems (WIDS).`
    },
    flipper: {
      title: "Flipper Zero",
      price: "Multi Tool",
      description: `Portable hacking tool capable of interacting with Sub-GHz radio, RFID/NFC, infrared signals, and GPIO pins. Can emulate access cards, remote controls, and perform BadUSB attacks.`,
      defense: `Secure IoT devices, disable unused interfaces, enforce strong authentication, and monitor unusual signals.`
    },
    keylogger: {
      title: "Hardware Keylogger",
      price: "PS/2 + USB",
      description: `A physical device placed between a keyboard and computer to capture keystrokes silently without software detection.`,
      defense: `Inspect USB ports regularly, restrict physical access, and use encrypted keyboards.`
    },
    portal: {
      title: "Evil Portal Attack",
      price: "Rogue AP",
      description: `Creates a fake WiFi login page to capture user credentials by mimicking legitimate networks.`,
      defense: `Use HTTPS, avoid unknown WiFi networks, and enable multi-factor authentication.`
    }
  };

  if (!active || !tools[active]) {
    return (
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 h-full flex flex-col items-center justify-center text-center shadow-2xl min-h-[400px]">
        <Info className="text-gray-500 mb-4" size={48} />
        <h3 className="text-gray-400 font-black uppercase tracking-widest text-sm mb-2">Awaiting Selection</h3>
        <p className="text-gray-500 text-xs font-medium max-w-[200px]">Select a hardware vector from the grid to view tactical intelligence.</p>
      </div>
    );
  }

  const tool = tools[active];

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 h-full shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-300 min-h-[400px]">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-orange-400 to-amber-400"></div>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">{tool.title}</h2>
          <span className="text-[10px] font-black font-mono text-orange-400 uppercase tracking-widest border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 rounded-lg inline-block mt-3">
            {tool.price}
          </span>
        </div>
      </div>

      <div className="space-y-8 flex-1">
        <div>
          <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3 flex items-center gap-2">
            <Info size={14} className="text-blue-400"/> Operational Overview
          </h3>
          <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed bg-[var(--bg-elevated)] p-5 rounded-2xl border border-[var(--border)] shadow-inner">
            {tool.description}
          </p>
        </div>

        <div>
          <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-3 flex items-center gap-2">
            <ShieldAlert size={14} /> Defensive Countermeasures
          </h3>
          <div className="bg-emerald-600/10 dark:bg-emerald-500/10 p-5 rounded-2xl border border-emerald-600/20 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 font-medium text-sm leading-relaxed shadow-inner">
            {tool.defense}
          </div>
        </div>
      </div>
    </div>
  );
}