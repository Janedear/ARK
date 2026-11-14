import React from 'react';
import { Loader2 } from 'lucide-react';
import useOverview from '@/components/overview/useOverview';
import OverviewNumber from '@/components/overview/OverviewNumber';
import OverviewTimeline from '@/components/overview/OverviewTimeline';
import OverviewDonut from '@/components/overview/OverviewDonut';
import OverviewTrend from '@/components/overview/OverviewTrend';
import OverviewSidePanels from '@/components/overview/OverviewSidePanels';
import '@/components/overview/overview.css';

export default function Dashboard() {
  const { months, selected, onSelect, month, report, context } = useOverview();
  const data = report.data;
  const failed = report.isError || context.isError;
  const loading = report.isLoading || context.isLoading;
  const updated = Math.min(report.dataUpdatedAt || Date.now(), context.dataUpdatedAt || Date.now());
  return <section className="smd-section"><div className="smd-sheet" data-smd>
    <header className="smd-head"><p className="smd-eyebrow">Coordinate response / reporting desk</p><div className="smd-head-row"><h1 className="smd-code">Situation overview</h1><span className="smd-head-right">SAVED RECORDS · PROTOTYPE</span></div><p className="smd-description">Review what has been reported, where response work stands, and which services need attention. This is not an emergency alert service.</p></header>
    <div className="smd-frame"><div className="smd-serial">{[['PERIOD', month.label], ['SCOPE', 'Records available to this account'], ['FETCHED', loading ? 'Loading…' : failed ? 'Unavailable' : new Date(updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })]].map(([label, value]) => <div className="smd-serial-field" key={label}><span className="smd-serial-label">{label}</span><span className="smd-serial-value">{value}</span></div>)}</div>
      <OverviewTimeline months={months} selected={selected} onSelect={onSelect} total={data?.total} />
      {failed ? <div className="smd-empty" role="alert">Reports could not be loaded. Check your connection; no figures are assumed.<button className="smd-text-link" onClick={() => { report.refetch(); context.refetch(); }}>Retry loading</button></div> : loading ? <div className="smd-empty" role="status"><Loader2 className="animate-spin" size={22} /> Loading saved response records…</div> : <div className="smd-grid">
        <div className="smd-col smd-col--main"><div className="smd-kpis">{[['Reports recorded', data.total, 'Created in the selected month', 'nw'], ['Still open', data.open, 'Current status of those reports', 'spend'], ['Resolved / closed', data.percentage, 'Share of those reports today', 'save']].map(([label, value, note, key]) => <div className={`smd-kpi smd-kpi--${key}`} key={key}><h2 className="smd-kpi-label">{label}</h2><div className="smd-kpi-value"><OverviewNumber value={value} suffix={key === 'save' ? '%' : ''} /></div><p className="smd-kpi-delta">{note}</p></div>)}</div>
          <OverviewDonut rows={data.severity} total={data.total} />
          <OverviewTrend rows={context.data.trend} months={months} selected={selected} onSelect={onSelect} />
        </div><OverviewSidePanels report={data} context={context.data} month={month} />
      </div>}
    </div>
  </div></section>;
}