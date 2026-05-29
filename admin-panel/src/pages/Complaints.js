import { ChevronDown, ChevronUp } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import client from '../api/client';

const fallbackComplaints = [
  { id: 'C-101', user: 'neha@arena.gg', host: 'PixelForge-01', description: 'Session had 15 minutes of repeated frame drops and one disconnect while playing Cyberpunk 2077.', status: 'reviewing', date: '2025-02-18T10:00:00Z', response: '' },
  { id: 'C-099', user: 'vivek@pixelplay.in', host: 'CloudArcade-12', description: 'Host was marked online but session never started. Tokens were deducted instantly.', status: 'resolved', date: '2025-02-17T14:10:00Z', response: 'Refund issued and host uptime audit requested.' },
  { id: 'C-094', user: 'harsh@gamelink.dev', host: 'StormRig-07', description: 'Owner used misleading GPU listing. Performance did not match the advertised tier.', status: 'dismissed', date: '2025-02-16T18:30:00Z', response: 'Specs were validated during review. Complaint closed.' },
];

const statusClasses = {
  reviewing: 'bg-amber-500/10 text-amber-300',
  resolved: 'bg-emerald-500/10 text-emerald-300',
  dismissed: 'bg-rose-500/10 text-rose-300',
};

function Complaints() {
  const [complaints, setComplaints] = useState(fallbackComplaints);
  const [expandedId, setExpandedId] = useState('');
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await client.get('/admin/complaints');
        const payload = response.data?.data || response.data;
        const nextComplaints = payload?.complaints || payload || fallbackComplaints;
        setComplaints(nextComplaints);
        setDrafts(
          nextComplaints.reduce((accumulator, complaint) => {
            accumulator[complaint.id] = { response: complaint.response || '', status: complaint.status || 'reviewing' };
            return accumulator;
          }, {})
        );
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Unable to load complaints. Showing fallback cases.');
        setDrafts(
          fallbackComplaints.reduce((accumulator, complaint) => {
            accumulator[complaint.id] = { response: complaint.response || '', status: complaint.status || 'reviewing' };
            return accumulator;
          }, {})
        );
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  const sortedComplaints = useMemo(
    () => [...complaints].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [complaints]
  );

  const updateComplaint = async (complaintId) => {
    setSavingId(complaintId);
    setError('');

    try {
      await client.put(`/admin/complaints/${complaintId}`, drafts[complaintId]);
      setComplaints((current) =>
        current.map((complaint) =>
          complaint.id === complaintId ? { ...complaint, ...drafts[complaintId] } : complaint
        )
      );
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to update complaint right now.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white">Complaints</h3>
        <p className="mt-1 text-sm text-slate-400">Review renter complaints, respond with context, and close disputes quickly.</p>
      </div>
      {error ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-glow">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-5 py-4 text-left font-medium">ID</th>
              <th className="px-5 py-4 text-left font-medium">User</th>
              <th className="px-5 py-4 text-left font-medium">Host</th>
              <th className="px-5 py-4 text-left font-medium">Description</th>
              <th className="px-5 py-4 text-left font-medium">Status</th>
              <th className="px-5 py-4 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`complaint-skeleton-${index}`}>
                    <td colSpan={6} className="px-5 py-5">
                      <div className="h-5 animate-pulse rounded bg-slate-800" />
                    </td>
                  </tr>
                ))
              : null}
            {!loading && sortedComplaints.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  No complaints found.
                </td>
              </tr>
            ) : null}
            {!loading
              ? sortedComplaints.map((complaint) => {
                  const draft = drafts[complaint.id] || { response: '', status: complaint.status };
                  const isExpanded = expandedId === complaint.id;

                  return (
                    <Fragment key={complaint.id}>
                      <tr className="transition hover:bg-slate-800/30">
                        <td className="px-5 py-4 font-medium text-white">{complaint.id}</td>
                        <td className="px-5 py-4">{complaint.user}</td>
                        <td className="px-5 py-4">{complaint.host}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? '' : complaint.id)}
                            className="inline-flex items-center gap-2 text-left text-slate-200"
                          >
                            <span>{complaint.description.slice(0, 70)}{complaint.description.length > 70 ? '...' : ''}</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses[complaint.status] || 'bg-slate-800 text-slate-300'}`}>
                            {complaint.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">{new Date(complaint.date).toLocaleString()}</td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-slate-950/40">
                          <td colSpan={6} className="px-5 py-5">
                            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Full description</h4>
                                <p className="mt-3 text-sm leading-6 text-slate-300">{complaint.description}</p>
                              </div>
                              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-300">Response</label>
                                  <textarea
                                    rows={4}
                                    value={draft.response}
                                    onChange={(event) =>
                                      setDrafts((current) => ({
                                        ...current,
                                        [complaint.id]: { ...draft, response: event.target.value },
                                      }))
                                    }
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-gaming-500 focus:ring-gaming-500"
                                    placeholder="Respond to the complaint or add internal admin notes."
                                  />
                                </div>
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-300">Status</label>
                                  <select
                                    value={draft.status}
                                    onChange={(event) =>
                                      setDrafts((current) => ({
                                        ...current,
                                        [complaint.id]: { ...draft, status: event.target.value },
                                      }))
                                    }
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-gaming-500 focus:ring-gaming-500"
                                  >
                                    <option value="reviewing">reviewing</option>
                                    <option value="resolved">resolved</option>
                                    <option value="dismissed">dismissed</option>
                                  </select>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => updateComplaint(complaint.id)}
                                  disabled={savingId === complaint.id}
                                  className="rounded-xl bg-gaming-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-gaming-500 disabled:opacity-50"
                                >
                                  {savingId === complaint.id ? 'Saving...' : 'Save response'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Complaints;
