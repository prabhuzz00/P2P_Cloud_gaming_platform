import { Coins, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import client from '../api/client';

function TokenManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [grantForm, setGrantForm] = useState({ userId: '', amount: '', description: '' });
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await client.get('/admin/users');
        const payload = response.data?.data || response.data;
        const rawUsers = payload?.users || payload || [];
        setUsers(rawUsers.map((u) => ({
          id: u.id,
          email: u.email,
          token_balance: u.token_balance ?? 0,
        })));
      } catch (fetchError) {
        setError('Unable to load users.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleGrant = async (event) => {
    event.preventDefault();
    setGranting(true);
    setError('');
    setSuccess('');

    const amount = Number.parseInt(grantForm.amount, 10);
    if (!grantForm.userId) {
      setError('Please select a user.');
      setGranting(false);
      return;
    }
    if (!Number.isInteger(amount) || amount === 0) {
      setError('Amount must be a non-zero integer.');
      setGranting(false);
      return;
    }

    try {
      const response = await client.post(`/admin/users/${grantForm.userId}/tokens`, {
        amount,
        description: grantForm.description || undefined,
      });
      const result = response.data;
      setSuccess(result.message || `Successfully ${amount > 0 ? 'granted' : 'deducted'} ${Math.abs(amount)} tokens.`);
      // Update local user list
      setUsers((current) =>
        current.map((u) =>
          u.id === grantForm.userId ? { ...u, token_balance: result.user?.token_balance ?? u.token_balance + amount } : u
        )
      );
      setGrantForm({ userId: '', amount: '', description: '' });
    } catch (grantError) {
      setError(grantError.response?.data?.error || grantError.response?.data?.message || 'Failed to update tokens.');
    } finally {
      setGranting(false);
    }
  };

  const quickGrant = async (userId, amount) => {
    setError('');
    setSuccess('');

    try {
      const response = await client.post(`/admin/users/${userId}/tokens`, {
        amount,
        description: `Admin quick-grant: ${amount} tokens for testing`,
      });
      const result = response.data;
      setSuccess(result.message || `Granted ${amount} tokens.`);
      setUsers((current) =>
        current.map((u) =>
          u.id === userId ? { ...u, token_balance: result.user?.token_balance ?? u.token_balance + amount } : u
        )
      );
    } catch (grantError) {
      setError(grantError.response?.data?.error || 'Failed to grant tokens.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-white">Token Management</h3>
        <p className="mt-1 text-sm text-slate-400">
          Grant or deduct tokens for users. Use this for testing before in-app purchase integration is complete.
        </p>
      </div>

      {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}

      {/* Grant Form */}
      <form onSubmit={handleGrant} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-glow">
        <h4 className="mb-4 text-lg font-medium text-white">Grant / Deduct Tokens</h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="grantUser" className="mb-2 block text-sm font-medium text-slate-300">User</label>
            <select
              id="grantUser"
              value={grantForm.userId}
              onChange={(e) => setGrantForm((f) => ({ ...f, userId: e.target.value }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-gaming-500 focus:ring-gaming-500"
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.email} (Balance: {u.token_balance})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="grantAmount" className="mb-2 block text-sm font-medium text-slate-300">Amount</label>
            <input
              id="grantAmount"
              type="number"
              value={grantForm.amount}
              onChange={(e) => setGrantForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 500 or -100"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-gaming-500 focus:ring-gaming-500"
            />
          </div>
          <div>
            <label htmlFor="grantDesc" className="mb-2 block text-sm font-medium text-slate-300">Description (optional)</label>
            <input
              id="grantDesc"
              type="text"
              value={grantForm.description}
              onChange={(e) => setGrantForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Reason for grant/deduction"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-gaming-500 focus:ring-gaming-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={granting || loading}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gaming-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-gaming-500 disabled:opacity-50"
        >
          <Coins size={16} />
          {granting ? 'Processing...' : 'Submit'}
        </button>
      </form>

      {/* User List with Quick Grant */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-glow">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-medium text-white">User Balances</h4>
          <div className="flex w-full max-w-xs items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-400">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-none bg-transparent p-0 text-sm text-white placeholder:text-slate-500 focus:ring-0"
              placeholder="Search by email"
            />
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-800" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <p className="py-8 text-center text-slate-400">No users found.</p>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{user.email}</p>
                    <p className="text-sm text-slate-400">Balance: <span className="text-gaming-300">{user.token_balance} tokens</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => quickGrant(user.id, 100)}
                      className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      onClick={() => quickGrant(user.id, 500)}
                      className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
                    >
                      +500
                    </button>
                    <button
                      type="button"
                      onClick={() => quickGrant(user.id, 1000)}
                      className="rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/25"
                    >
                      +1000
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TokenManagement;
