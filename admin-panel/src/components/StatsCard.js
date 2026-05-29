import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

function StatsCard({ title, value, icon: Icon, trend }) {
  const isPositive = trend?.direction !== 'down';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-3 text-3xl font-semibold text-white">{value}</h3>
        </div>
        <div className="rounded-xl bg-gaming-600/20 p-3 text-gaming-300">
          {Icon ? <Icon size={22} /> : null}
        </div>
      </div>
      {trend ? (
        <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${isPositive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{trend.value}</span>
        </div>
      ) : null}
    </div>
  );
}

export default StatsCard;
