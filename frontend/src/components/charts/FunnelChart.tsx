'use client';

interface FunnelData {
  stage: string;
  value: number;
}

export default function FunnelChart({ data }: { data: FunnelData[] }) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="w-full space-y-4 py-4">
      {data.map((item, index) => {
        const width = (item.value / maxValue) * 100;
        return (
          <div key={item.stage} className="relative">
            <div className="flex justify-between items-center mb-1 px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.stage}</span>
              <span className="text-xs font-mono text-amber-500 font-bold">{item.value}</span>
            </div>
            <div className="h-8 w-full bg-slate-800/50 rounded-lg overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-amber-500/20 to-amber-500 transition-all duration-1000"
                style={{ 
                  width: `${width}%`,
                  margin: '0 auto',
                  clipPath: `polygon(${(100-width)/2}% 0%, ${100 - (100-width)/2}% 0%, ${100 - (100-width)/4}% 100%, ${(100-width)/4}% 100%)`
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
