import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function VectorRadar({ data, darkTheme }) {
  const gridStroke = darkTheme ? "rgba(255, 255, 255, 0.1)" : "#CBD5E1"; // matches --border
  const tickFill = darkTheme ? "#94a3b8" : "#475569";
  const tooltipBg = darkTheme ? "rgba(2, 6, 23, 0.95)" : "rgba(255, 255, 255, 0.95)";
  const tooltipBorder = darkTheme ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(15, 23, 42, 0.1)";
  const tooltipText = darkTheme ? "#ffffff" : "#061024";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke={gridStroke} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: tickFill, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }} />
        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
        <Radar name="Threat Intensity" dataKey="A" stroke="#06b6d4" strokeWidth={2} fill="#06b6d4" fillOpacity={0.5} />
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
          itemStyle={{ color: '#22d3ee' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
