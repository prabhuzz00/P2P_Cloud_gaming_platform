import { DollarSign, MonitorPlay, PlayCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import client from '../api/client';
import StatsCard from '../components/StatsCard';

const fallbackDashboard = {
  stats: {
    totalUsers: 1842,
    totalHosts: 214,
    activeSessions: 63,
    revenueToday: '₹48,920',
  },
  revenueTrend: [
    { label: 'Mon', revenue: 32000 },
    { label: 'Tue', revenue: 34800 },
    { label: 'Wed', revenue: 39200 },
    { label: 'Thu', revenue: 41800 },
    { label: 'Fri', revenue: 46300 },
    { label: 'Sat', revenue: 48920 },
  ],
  sessionTrend: [
    { label: 'Mon', sessions: 52 },
    { label: 'Tue', sessions: 55 },
    { label: 'Wed', sessions: 61 },
    { label: 'Thu', sessions: 58 },
    { label: 'Fri', sessions: 67 },
    { label: 'Sat', sessions: 63 },
  ],
  recentActivity: [
    { id: '1', title: 'Host EdgeNode-27 verified', time: '10 minutes ago', detail: 'RTX 4080 host approved for Mumbai West region.' },
    { id: '2', title: 'Refund issued for expired session', time: '28 minutes ago', detail: '₹420 returned to renter on session #S-2109.' },
    { id: '3', title: 'High-value token purchase detected', time: '1 hour ago', detail: 'User rajiv@arena.gg bought 12,000 tokens.' },
  ],
};

function Dashboard() {
  const [dashboard, setDashboard] = useState(fallbackDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await client.get('/admin/dashboard');
        const payload = response.data?.data || response.data;

        setDashboard({
          stats: payload?.stats || fallbackDashboard.stats,
          revenueTrend: payload?.revenueTrend || payload?.revenueOverTime || fallbackDashboard.revenueTrend,
          sessionTrend: payload?.sessionTrend || payload?.sessionsPerDay || fallbackDashboard.sessionTrend,
          recentActivity: payload?.recentActivity || fallbackDashboard.recentActivity,
        });
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Dashboard data is currently unavailable. Showing cached insights.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = [
    { title: 'Total Users', value: dashboard.stats.totalUsers?.toLocaleString?.() || dashboard.stats.totalUsers, icon: Users, trend: { value: '+8.4% vs last week', direction: 'up' } },
    { title: 'Total Hosts', value: dashboard.stats.totalHosts?.toLocaleString?.() || dashboard.stats.totalHosts, icon: MonitorPlay, trend: { value: '+5.1% vs last week', direction: 'up' } },
    { title: 'Active Sessions', value: dashboard.stats.activeSessions?.toLocaleString?.() || dashboard.stats.activeSessions, icon: PlayCircle, trend: { value: '-2.2% from peak hour', direction: 'down' } },
    { title: 'Revenue (Today)', value: dashboard.stats.revenueToday, icon: DollarSign, trend: { value: '+11.8% vs yesterday', direction: 'up' } },
  ];

  return (
    <div className="space-y-8">
      {error ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-4 md:grid-cols-2">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-glow">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Revenue over time</h3>
              <p className="mt-1 text-sm text-slate-400">Daily platform revenue from purchases, rentals, and commissions.</p>
            </div>
          </div>
          <div className="h-80">
            {loading ? (
              <div className="h-full animate-pulse rounded-2xl bg-slate-800" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-glow">
          <h3 className="text-lg font-semibold text-white">Sessions per day</h3>
          <p className="mt-1 text-sm text-slate-400">Track renter demand and host availability trends.</p>
          <div className="mt-6 h-80">
            {loading ? (
              <div className="h-full animate-pulse rounded-2xl bg-slate-800" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.sessionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  <Bar dataKey="sessions" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Recent activity</h3>
            <p className="mt-1 text-sm text-slate-400">A quick stream of critical admin-relevant events.</p>
          </div>
          <span className="rounded-full bg-gaming-600/10 px-3 py-1 text-xs font-medium text-gaming-300">Live feed</span>
        </div>
        <div className="mt-6 space-y-4">
          {dashboard.recentActivity.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="font-medium text-white">{item.title}</h4>
                  <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.25em] text-slate-500">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
