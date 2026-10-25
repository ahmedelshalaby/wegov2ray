import React, { useEffect, useState } from 'react';
import { Users, Cpu, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface StatusData {
  status: 'online' | 'degraded' | 'offline';
  nodesOnline: number;
  totalNodes: number;
  connectedUsers: number;
  serverLoadPercent: number;
  capacityState: 'available' | 'high_demand' | 'full';
  availablePercent: number;
}

export const ServerStatus: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<StatusData>({
    status: 'online',
    nodesOnline: 2,
    totalNodes: 2,
    connectedUsers: 38,
    serverLoadPercent: 19,
    capacityState: 'available',
    availablePercent: 85,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const json: any = await res.json();
        if (json && json.success) {
          setData(json as StatusData);
        }
      }
    } catch (err) {
      console.warn('Status fetch error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = data.status === 'online';

  return (
    <section id="status" className="w-full py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block text-[11px] font-semibold text-[#FFD60A] bg-[#FFD60A]/10 px-3 py-1 rounded-full border border-[#FFD60A]/20 mb-2 transition-transform duration-200 hover:scale-105">
            {t.status.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#E8E8E8] tracking-tight">
            {t.status.title}
          </h2>
          <p className="text-sm text-[#8A8A8A] mt-2 max-w-md mx-auto">
            {t.status.subtitle}
          </p>
        </div>

        <div className="w-full max-w-2xl mx-auto rounded-[14px] bg-[#121212] border border-[#222222] p-5 sm:p-7 shadow-card transition-all duration-300 hover:border-[#2C2C2C]">
          {/* Main Health Status Indicator */}
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#1E1E1E]">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isOnline ? 'bg-green-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                    isOnline ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <div>
                <h4 className="text-sm font-bold text-[#E8E8E8]">
                  {isOnline ? t.status.stateOnline : t.status.stateDegraded}
                </h4>
                <span className="text-[11px] text-[#8A8A8A]">{t.status.lastUpdated}</span>
              </div>
            </div>

            <button
              onClick={fetchStatus}
              disabled={isRefreshing}
              className="p-2 rounded-[10px] bg-[#1A1A1A] hover:bg-[#222222] text-[#8A8A8A] hover:text-[#FFD60A] border border-[#252525] hover:border-[#353535] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer group"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? 'animate-spin text-[#FFD60A]' : 'group-hover:rotate-180'}`} />
            </button>
          </div>

          {/* 3 Metric Cards with Interactive Hover */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Active Connected Users */}
            <div className="interactive-card p-4 rounded-[12px] bg-[#0E0E0E] border border-[#222222] flex flex-col justify-between group">
              <div className="flex items-center justify-between text-[#8A8A8A] mb-2">
                <span className="text-xs font-medium group-hover:text-[#E8E8E8] transition-colors">{t.status.connectedUsers}</span>
                <Users className="w-4 h-4 text-[#FFD60A] transition-transform duration-200 group-hover:scale-110" />
              </div>
              <span className="text-xl sm:text-2xl font-mono font-bold text-[#E8E8E8]">
                {data.connectedUsers}
              </span>
            </div>

            {/* Server Load % */}
            <div className="interactive-card p-4 rounded-[12px] bg-[#0E0E0E] border border-[#222222] flex flex-col justify-between group">
              <div className="flex items-center justify-between text-[#8A8A8A] mb-2">
                <span className="text-xs font-medium group-hover:text-[#E8E8E8] transition-colors">{t.status.serverLoad}</span>
                <Cpu className="w-4 h-4 text-[#FFD60A] transition-transform duration-200 group-hover:scale-110" />
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xl sm:text-2xl font-mono font-bold text-[#E8E8E8]">
                    {data.serverLoadPercent}%
                  </span>
                </div>
                {/* Visual load bar with smooth animation */}
                <div className="w-full bg-[#1E1E1E] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      data.serverLoadPercent > 80
                        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                        : data.serverLoadPercent > 50
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : 'bg-[#FFD60A] shadow-[0_0_8px_rgba(255,214,10,0.8)]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(8, data.serverLoadPercent))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Capacity Status */}
            <div className="interactive-card p-4 rounded-[12px] bg-[#0E0E0E] border border-[#222222] flex flex-col justify-between group">
              <div className="flex items-center justify-between text-[#8A8A8A] mb-2">
                <span className="text-xs font-medium group-hover:text-[#E8E8E8] transition-colors">{t.status.capacity}</span>
                {data.capacityState === 'available' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 transition-transform duration-200 group-hover:scale-110" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 transition-transform duration-200 group-hover:scale-110" />
                )}
              </div>
              <div>
                <span className="text-sm sm:text-base font-bold text-[#E8E8E8]">
                  {t.status.capacityStates[data.capacityState] || t.status.capacityStates.available}
                </span>
                <span className="block text-[11px] text-[#8A8A8A] mt-0.5 font-mono">
                  {data.availablePercent}% free
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
