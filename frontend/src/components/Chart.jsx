import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

export default function Chart({ data, darkTheme }) {
  const gridStroke = darkTheme ? "rgba(255, 255, 255, 0.05)" : "#CBD5E1"; // matches --border
  const tickFill = darkTheme ? "#94a3b8" : "#475569";
  const tooltipBg = darkTheme ? "rgba(2, 6, 23, 0.95)" : "rgba(255, 255, 255, 0.95)";
  const tooltipBorder = darkTheme ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid #10b981";
  const tooltipText = darkTheme ? "#ffffff" : "#061024";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey="date" stroke={darkTheme ? "rgba(255,255,255,0.2)" : "#CBD5E1"} tick={{ fill: tickFill, fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis stroke={darkTheme ? "rgba(255,255,255,0.2)" : "#CBD5E1"} tick={{ fill: tickFill, fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: tooltipBg, 
            border: tooltipBorder, 
            borderRadius: '12px', 
            color: tooltipText, 
            fontSize: '12px', 
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
          itemStyle={{ color: '#10b981' }}
        />
        <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}