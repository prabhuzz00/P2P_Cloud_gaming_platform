import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import DataTable from '../components/DataTable';

const fallbackSessions = [
  { id: 'S-3201', host: 'PixelForge-01', renter: 'neha@arena.gg', startTime: '2025-02-18T12:00:00Z', endTime: '2025-02-18T14:00:00Z', status: 'active', tokensSpent: 480 },
  { id: 'S-3200', host: 'CloudArcade-12', renter: 'vivek@pixelplay.in', startTime: '2025-02-18T08:00:00Z', endTime: '2025-02-18T10:00:00Z', status: 'completed', tokensSpent: 360 },
  { id: 'S-3197', host: 'StormRig-07', renter: 'harsh@gamelink.dev', startTime: '2025-02-17T22:00:00Z', endTime: '2025-02-17T23:00:00Z', status: 'expired', tokensSpent: 120 },
];

const filters = ['All', 'Active', 'Completed', 'Expired'];
const statusClasses = {
  active: 'bg-cyan-500/10 text-cyan-300',
  completed: 'bg-emerald-500/10 text-emerald-300',
  expired: 'bg-amber-500/10 text-amber-300',
};

function Sessions() {
  const [sessions, setSessions] = useState(fallbackSessions);
  const [filter, setFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await client.get('/admin/sessions');
        const payload = response.data?.data || response.data;
        setSessions(payload?.sessions || payload || fallbackSessions);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Unable to load sessions. Showing fallback records.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) => {
        if (filter === 'All') return true;
        return session.status?.toLowerCase() === filter.toLowerCase();
      }),
    [filter, sessions]
  );

  const columns = [
    { key: 'id', label: 'Session ID', sortable: true, render: (session) => <span className="font-medium text-white">{session.id}</span> },
    { key: 'host', label: 'Host', sortable: true },
    { key: 'renter', label: 'Renter', sortable: true },
    { key: 'startTime', label: 'Start Time', sortable: true, render: (session) => new Date(session.startTime).toLocaleString() },
    { key: 'endTime', label: 'End Time', sortable: true, render: (session) => new Date(session.endTime).toLocaleString() },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (session) => <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses[session.status] || 'bg-slate-800 text-slate-300'}`}>{session.status}</span>,
    },
    { key: 'tokensSpent', label: 'Tokens Spent', sortable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Sessions</h3>
          <p className="mt-1 text-sm text-slate-400">Audit active and completed rentals to spot revenue leakage and host issues.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === tab ? 'bg-gaming-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      {error ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}
      <DataTable
        columns={columns}
        data={filteredSessions}
        loading={loading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalPages={Math.max(1, Math.ceil(filteredSessions.length / 8))}
        pageSize={8}
        emptyMessage="No sessions match this status."
      />
    </div>
  );
}

export default Sessions;
