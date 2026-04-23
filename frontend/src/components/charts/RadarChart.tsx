'use client';

import { ResponsiveContainer, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, Radar, Tooltip, Legend } from 'recharts';

interface RadarData {
  metric: string;
  business: number;
  competitor_avg: number;
}

export default function RadarChart({ data }: { data: RadarData[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#1E1E2E" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748B', fontSize: 12 }} />
          <Radar
            name="Your Business"
            dataKey="business"
            stroke="#F59E0B"
            fill="#F59E0B"
            fillOpacity={0.6}
          />
          <Radar
            name="Competitors"
            dataKey="competitor_avg"
            stroke="#6366F1"
            fill="#6366F1"
            fillOpacity={0.4}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#12121A', border: '1px solid #1E1E2E', borderRadius: '8px' }}
          />
          <Legend />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
