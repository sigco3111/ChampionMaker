
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartDataItem } from '../types';

interface StatsChartProps {
  data: ChartDataItem[];
}

const StatsChart: React.FC<StatsChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center p-4">표시할 능력치 데이터가 없습니다.</div>;
  }

  return (
    <div className="h-64 md:h-80 w-full bg-slate-800 p-4 rounded-lg shadow-lg">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
          <XAxis dataKey="name" stroke="#CBD5E0" tick={{ fontSize: 12 }} />
          <YAxis stroke="#CBD5E0" domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #2D3748', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#E2E8F0', fontWeight: 'bold' }}
            itemStyle={{ color: '#A0AEC0' }}
            formatter={(value: number, name: string, props: {payload: ChartDataItem}) => [`${value} / ${props.payload.maxValue}`, props.payload.name]}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#E2E8F0' }} />
          <Bar dataKey="value" name="능력치" fill="#2563EB" barSize={30} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatsChart;
