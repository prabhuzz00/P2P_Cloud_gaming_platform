import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import DataTable from '../components/DataTable';

const userFallback = [
  { id: 'u-01', email: 'neha@arena.gg', tokenBalance: 6800, joinedDate: '2024-10-02T08:45:00Z', status: 'active' },
  { id: 'u-02', email: 'harsh@gamelink.dev', tokenBalance: 1250, joinedDate: '2024-11-19T15:12:00Z', status: 'banned' },
  { id: 'u-03', email: 'vivek@pixelplay.in', tokenBalance: 3200, joinedDate: '2025-01-06T09:30:00Z', status: 'active' },
];

const statusClasses = {
  active: 'bg-emerald-500/10 text-emerald-300',
  banned: 'bg-rose-500/10 text-rose-300',
};

function Users() {
  const [users, setUsers] = useState(userFallback);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingUser, setUpdatingUser] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await client.get('/admin/users');
        const payload = response.data?.data || response.data;
        setUsers(payload?.users || payload || userFallback);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Unable to load users. Showing fallback data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const toggleStatus = async (user) => {
    const nextStatus = user.status === 'banned' ? 'active' : 'banned';
    setUpdatingUser(user.id);
    setError('');

    try {
      await client.put(`/admin/users/${user.id}`, { status: nextStatus });
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)));
    } catch (actionError) {
      setError(actionError.response?.data?.message || 'Unable to update user status.');
    } finally {
      setUpdatingUser('');
    }
  };

  const filteredUsers = useMemo(
    () => users.filter((user) => user.email?.toLowerCase().includes(search.trim().toLowerCase())),
    [search, users]
  );

  const columns = [
    { key: 'email', label: 'Email', sortable: true, render: (user) => <span className="font-medium text-white">{user.email}</span> },
    { key: 'tokenBalance', label: 'Token Balance', sortable: true, render: (user) => `${user.tokenBalance?.toLocaleString?.() || user.tokenBalance} tokens` },
    {
      key: 'joinedDate',
      label: 'Joined Date',
      sortable: true,
      render: (user) => new Date(user.joinedDate).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user) => <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses[user.status]}`}>{user.status}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user) => (
        <button
          type="button"
          disabled={updatingUser === user.id}
          onClick={() => toggleStatus(user)}
          className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
            user.status === 'banned' ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
          }`}
        >
          {updatingUser === user.id ? 'Updating...' : user.status === 'banned' ? 'Unban' : 'Ban'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Users</h3>
          <p className="mt-1 text-sm text-slate-400">Manage balances, identify suspicious accounts, and enforce platform rules.</p>
        </div>
        <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-400">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full border-none bg-transparent p-0 text-sm text-white placeholder:text-slate-500 focus:ring-0"
            placeholder="Search by email"
          />
        </div>
      </div>
      {error ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}
      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalPages={Math.max(1, Math.ceil(filteredUsers.length / 8))}
        pageSize={8}
        emptyMessage="No users found for this search."
      />
    </div>
  );
}

export default Users;
