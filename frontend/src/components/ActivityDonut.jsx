import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function ActivityDonut({ data }) {
  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']; // Red, Blue, Yellow, Purple

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={70}
          outerRadius={95}
          paddingAngle={8}
          dataKey="value"
          stroke="none"
          cornerRadius={8}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: `drop-shadow(0px 0px 8px ${COLORS[index % COLORS.length]}80)` }} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: 'rgba(2,6,23,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }} 
          itemStyle={{ color: '#fff' }}
        />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#cbd5e1' }} iconType="circle"/>
      </PieChart>
    </ResponsiveContainer>
  );
}
