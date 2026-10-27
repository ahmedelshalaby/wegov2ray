import React, { useEffect, useState } from 'react';
import { Activity, Cpu, RefreshCw, Users, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';

interface StatusData {
  status: 'online' | 'degraded' | 'offline';
  tcpCount: number | null;
  xrayState: string;
  serverLoadPercent: number | null;
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

export const ServerStatus: React.FC = () => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const [data, setData] = useState<StatusData>({
    status: 'offline',
    tcpCount: null,
    xrayState: 'unknown',
    serverLoadPercent: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
    const interval = window.setInterval(() => void fetchStatus(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const online = data.status === 'online';
  const xrayRunning = data.xrayState === 'running';

  const statusLabel = online
    ? t.status.stateOnline
    : data.status === 'degraded'
      ? t.status.stateDegraded
      : t.status.stateOffline;
  const statusTone = online ? 'is-online' : data.status === 'degraded' ? 'is-unavailable' : 'is-offline';

  return (
    <section id="status" className="section status-section">
      <div className="container-page">
        <div className="split-layout">
          <Reveal>
            <SectionIntro
              index="02"
              eyebrow={t.status.badge}
              title={t.status.title}
              subtitle={t.status.subtitle}
            />
          </Reveal>

          <Reveal>
            <div className="status-card">
              <div className="status-card-head">
                <div className="status-service">
                  <span className={`status-pill ${statusTone}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {statusLabel}
                  </span>
                  <span className="status-service-label">{t.status.lastUpdated}</span>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void fetchStatus()}
                  disabled={loading}
                  aria-label={isAr ? 'تحديث' : 'Refresh'}
                  title={isAr ? 'تحديث' : 'Refresh'}
                >
                  <RefreshCw size={16} className={loading ? 'spin' : ''} aria-hidden="true" />
                </button>
              </div>

              <div className="status-metrics">
                <div className="status-metric">
                  <div className="metric-label">
                    <Users size={14} aria-hidden="true" />
                    {t.status.connectedUsers}
                  </div>
                  <p className="metric-value" dir="ltr">
                    {data.tcpCount !== null ? formatNumber(data.tcpCount) : '—'}
                  </p>
                  <p className="metric-hint">
                    {isAr ? 'اتصالات نشطة الآن' : 'Active connections now'}
                  </p>
                </div>

                <div className="status-metric">
                  <div className="metric-label">
                    <Cpu size={14} aria-hidden="true" />
                    {t.status.serverLoad}
                  </div>
                  <p className="metric-value" dir="ltr">
                    {data.serverLoadPercent !== null ? `${data.serverLoadPercent.toFixed(1)}%` : '—'}
                  </p>
                  <progress
                    className="metric-progress"
                    max={100}
                    value={data.serverLoadPercent ?? 0}
                    aria-label={t.status.serverLoad}
                  />
                  <p className="metric-hint">
                    {isAr ? 'متوسط الحمل الحالي' : 'Average current load'}
                  </p>
                </div>

                <div className="status-metric">
                  <div className="metric-label">
                    {xrayRunning ? (
                      <Wifi size={14} aria-hidden="true" />
                    ) : (
                      <WifiOff size={14} aria-hidden="true" />
                    )}
                    {t.status.xray}
                  </div>
                  <p className="metric-value metric-value-small">
                    {xrayRunning
                      ? t.status.xrayRunning
                      : data.xrayState === 'unknown'
                        ? t.status.xrayUnknown
                        : t.status.xrayStopped}
                  </p>
                  <p className="metric-hint">
                    {xrayRunning ? t.status.xrayOperational : t.status.xrayCheck}
                  </p>
                </div>
              </div>

              <div className="status-card-foot">
                <span>{t.status.lastUpdated}</span>
                <span className="status-foot-mark" aria-hidden="true" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
