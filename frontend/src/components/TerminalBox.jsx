import { useEffect, useState } from "react";

export default function TerminalBox({ lines = [] }) {
  const [output, setOutput] = useState([]);

  useEffect(() => {
    let i = 0;
    
    // Reset output when lines change
    setOutput([]);

    const interval = setInterval(() => {
      if (lines && i < lines.length) {
        // Use a functional update but capture the current line safely
        const currentLine = lines[i];
        if (currentLine !== undefined) {
            setOutput(prev => [...prev, currentLine]);
        }
        i++;
      }

      if (!lines || i >= lines.length) {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [lines]);

  return (
    <div className="space-y-1">
      {output.map((line, i) => (
        <div key={i} className={line?.includes("✔") ? "text-emerald-400 font-bold" : ""}>
            {`> ${line || ""}`}
        </div>
      ))}
      {output.length < (lines?.length || 0) && (
          <div className="animate-pulse">_</div>
      )}
    </div>
  );
}