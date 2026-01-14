
import React from 'react';
import { MonthlyTrend } from '../../services/plReportService';

interface Props {
  trends: MonthlyTrend[];
  byDestination?: { name: string; profit: number }[];
}

export const PLCharts: React.FC<Props> = ({ trends, byDestination }) => {
  if (trends.length === 0) return null;

  const maxRevenue = Math.max(...trends.map(t => t.revenue));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {/* Monthly Trend Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-6">Monthly Performance</h3>
        
        <div className="flex items-end justify-between h-48 gap-2">
          {trends.map((t, idx) => {
            const heightPerc = maxRevenue > 0 ? (t.revenue / maxRevenue) * 100 : 0;
            const profitHeight = maxRevenue > 0 ? (t.profit / maxRevenue) * 100 : 0;
            
            return (
              <div key={idx} className="flex flex-col items-center flex-1 group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 w-32 text-center pointer-events-none">
                   <p>Rev: {Math.round(t.revenue).toLocaleString()}</p>
                   <p className="text-green-300">Net: {Math.round(t.profit).toLocaleString()}</p>
                </div>

                <div className="w-full bg-slate-100 rounded-t-md relative flex items-end overflow-hidden" style={{ height: `${heightPerc}%` }}>
                   {/* Revenue Bar */}
                   <div className="w-full bg-blue-500 opacity-20 absolute top-0 bottom-0"></div>
                   {/* Profit Overlay */}
                   <div className="w-full bg-blue-600 absolute bottom-0" style={{ height: `${(t.profit / t.revenue) * 100}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-500 mt-2 font-medium truncate w-full text-center">{t.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-4 mt-4 text-xs text-slate-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-200"></div> Revenue</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600"></div> Gross Profit</div>
        </div>
      </div>

      {/* Destination/Profit Centers */}
      {byDestination && byDestination.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6">Top Profitable Destinations</h3>
            <div className="space-y-4">
                {byDestination.map((d, idx) => (
                    <div key={idx} className="relative">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700">{d.name}</span>
                            <span className="font-mono font-bold text-green-600">+{Math.round(d.profit).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div 
                                className="bg-green-500 h-2.5 rounded-full" 
                                style={{ width: `${(d.profit / byDestination[0].profit) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      )}
    </div>
  );
};
