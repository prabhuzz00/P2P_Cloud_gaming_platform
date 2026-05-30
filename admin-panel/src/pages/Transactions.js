import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import DataTable from '../components/DataTable';

const fallbackTransactions = [
  { id: 'T-4101', user: 'neha@arena.gg', type: 'Purchase', amount: '₹1,500', description: 'Token top-up via UPI', date: '2025-02-18T09:20:00Z' },
  { id: 'T-4100', user: 'PixelForge-01', type: 'Earning', amount: '₹980', description: 'Host payout for completed rental', date: '2025-02-18T08:00:00Z' },
  { id: 'T-4094', user: 'vivek@pixelplay.in', type: 'Rental', amount: '₹420', description: '2-hour gaming slot', date: '2025-02-17T18:10:00Z' },
  { id: 'T-4091', user: 'harsh@gamelink.dev', type: 'Refund', amount: '₹300', description: 'Expired session compensation', date: '2025-02-17T12:25:00Z' },
];

const typeClasses = {
  Purchase: 'bg-cyan-500/10 text-cyan-300',
  Rental: 'bg-violet-500/10 text-violet-300',
  Earning: 'bg-emerald-500/10 text-emerald-300',
  Refund: 'bg-amber-500/10 text-amber-300',
};

const typeOptions = ['All', 'Purchase', 'Rental', 'Earning', 'Refund'];

function Transactions() {
  const [transactions, setTransactions] = useState(fallbackTransactions);
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await client.get('/admin/transactions');
        const payload = response.data?.data || response.data;
        const rawTransactions = payload?.transactions || payload || fallbackTransactions;
        // Map backend fields to frontend fields
        const mapped = rawTransactions.map((t) => ({
          id: t.id,
          user: t.email || t.user || t.user_id,
          type: (t.type || '').charAt(0).toUpperCase() + (t.type || '').slice(1),
          amount: typeof t.amount === 'number' ? `₹${t.amount.toLocaleString()}` : (t.amount || '₹0'),
          description: t.description || '',
          date: t.created_at || t.date,
        }));
        setTransactions(mapped);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Unable to load transactions. Showing fallback ledger.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, dateRange.end, dateRange.start]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const matchesType = typeFilter === 'All' || transaction.type === typeFilter;
        const transactionDate = new Date(transaction.date);
        const afterStart = !dateRange.start || transactionDate >= new Date(dateRange.start);
        const beforeEnd = !dateRange.end || transactionDate <= new Date(`${dateRange.end}T23:59:59`);
        return matchesType && afterStart && beforeEnd;
      }),
    [dateRange.end, dateRange.start, transactions, typeFilter]
  );

  const columns = [
    { key: 'id', label: 'Transaction ID', sortable: true, render: (transaction) => <span className="font-medium text-white">{transaction.id}</span> },
    { key: 'user', label: 'User', sortable: true },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (transaction) => <span className={`rounded-full px-3 py-1 text-xs font-medium ${typeClasses[transaction.type] || 'bg-slate-800 text-slate-300'}`}>{transaction.type}</span>,
    },
    { key: 'amount', label: 'Amount', sortable: true },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'date', label: 'Date', sortable: true, render: (transaction) => new Date(transaction.date).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Transactions</h3>
          <p className="mt-1 text-sm text-slate-400">Inspect purchases, rentals, host earnings, and customer refunds.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white focus:border-gaming-500 focus:ring-gaming-500"
          >
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateRange.start}
            onChange={(event) => setDateRange((current) => ({ ...current, start: event.target.value }))}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white focus:border-gaming-500 focus:ring-gaming-500"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(event) => setDateRange((current) => ({ ...current, end: event.target.value }))}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white focus:border-gaming-500 focus:ring-gaming-500"
          />
        </div>
      </div>
      {error ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}
      <DataTable
        columns={columns}
        data={filteredTransactions}
        loading={loading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalPages={Math.max(1, Math.ceil(filteredTransactions.length / 8))}
        pageSize={8}
        emptyMessage="No transactions match the selected filters."
      />
    </div>
  );
}

export default Transactions;
