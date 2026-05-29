import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import DataTable from '../components/DataTable';

const hostFallback = [
  { id: 'h-01', hostName: 'PixelForge-01', ownerEmail: 'amit@pixelforge.gg', specs: 'RTX 4090 · 64GB RAM · Ryzen 9', gamesCount: 126, verifiedStatus: 'pending', onlineStatus: 'online' },
  { id: 'h-02', hostName: 'CloudArcade-12', ownerEmail: 'owner@cloudarcade.gg', specs: 'RTX 4080 · 32GB RAM · i9-14900K', gamesCount: 88, verifiedStatus: 'verified', onlineStatus: 'offline' },
  { id: 'h-03', hostName: 'StormRig-07', ownerEmail: 'support@stormrig.dev', specs: 'RX 7900 XTX · 32GB RAM · Ryzen 7', gamesCount: 64, verifiedStatus: 'verified', onlineStatus: 'online' },
];

const filters = ['All', 'Pending Verification', 'Verified', 'Online'];

const badgeClasses = {
  pending: 'bg-amber-500/10 text-amber-300',
  verified: 'bg-emerald-500/10 text-emerald-300',
  rejected: 'bg-rose-500/10 text-rose-300',
  online: 'bg-cyan-500/10 text-cyan-300',
  offline: 'bg-slate-700/70 text-slate-300',
};

function Hosts() {
  const [hosts, setHosts] = useState(hostFallback);
  const [filter, setFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHosts = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await client.get('/admin/hosts');
        const payload = response.data?.data || response.data;
        setHosts(payload?.hosts || payload || hostFallback);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Unable to load hosts. Showing fallback records.');
      } finally {
        setLoading(false);
      }
    };

    fetchHosts();
  }, []);

  const updateHostStatus = async (hostId, action) => {
    setActionId(hostId + action);
    setError('');

    try {
      await client.put(`/admin/hosts/${hostId}/verify`, { action });
      setHosts((current) =>
        current.map((host) =>
          host.id === hostId
            ? { ...host, verifiedStatus: action === 'verify' ? 'verified' : 'rejected' }
            : host
        )
      );
    } catch (actionError) {
      setError(actionError.response?.data?.message || `Unable to ${action} host right now.`);
    } finally {
      setActionId('');
    }
  };

  const filteredHosts = useMemo(() => {
    const normalized = filter.toLowerCase();
    return hosts.filter((host) => {
      if (normalized === 'all') return true;
      if (normalized === 'pending verification') return host.verifiedStatus === 'pending';
      if (normalized === 'verified') return host.verifiedStatus === 'verified';
      if (normalized === 'online') return host.onlineStatus === 'online';
      return true;
    });
  }, [filter, hosts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const columns = [
    { key: 'hostName', label: 'Host Name', sortable: true, render: (host) => <span className="font-medium text-white">{host.hostName || host.name}</span> },
    { key: 'ownerEmail', label: 'Owner Email', sortable: true },
    { key: 'specs', label: 'Specs', sortable: true },
    { key: 'gamesCount', label: 'Games Count', sortable: true },
    {
      key: 'verifiedStatus',
      label: 'Verified Status',
      sortable: true,
      render: (host) => (
        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${badgeClasses[host.verifiedStatus] || 'bg-slate-800 text-slate-300'}`}>
          {host.verifiedStatus}
        </span>
      ),
    },
    {
      key: 'onlineStatus',
      label: 'Online Status',
      sortable: true,
      render: (host) => (
        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${badgeClasses[host.onlineStatus] || 'bg-slate-800 text-slate-300'}`}>
          {host.onlineStatus}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (host) =>
        host.verifiedStatus !== 'pending' ? (
          <span className="text-slate-500">No action needed</span>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={actionId === `${host.id}verify`}
              onClick={() => updateHostStatus(host.id, 'verify')}
              className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              Verify
            </button>
            <button
              type="button"
              disabled={actionId === `${host.id}reject`}
              onClick={() => updateHostStatus(host.id, 'reject')}
              className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Hosts</h3>
          <p className="mt-1 text-sm text-slate-400">Approve capable gaming hosts and keep inventory quality high.</p>
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
        data={filteredHosts}
        loading={loading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalPages={Math.max(1, Math.ceil(filteredHosts.length / 8))}
        pageSize={8}
        emptyMessage="No hosts match this filter."
      />
    </div>
  );
}

export default Hosts;
