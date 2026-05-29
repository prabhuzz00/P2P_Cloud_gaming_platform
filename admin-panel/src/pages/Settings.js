import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import client from '../api/client';

const fallbackConfig = {
  pricePerSlot: 120,
  slotDuration: 60,
  platformCommission: 12,
};

function Settings() {
  const [form, setForm] = useState(fallbackConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await client.get('/admin/config');
        const payload = response.data?.data || response.data;
        setForm({
          pricePerSlot: payload?.pricePerSlot ?? fallbackConfig.pricePerSlot,
          slotDuration: payload?.slotDuration ?? fallbackConfig.slotDuration,
          platformCommission: payload?.platformCommission ?? payload?.commission ?? fallbackConfig.platformCommission,
        });
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Unable to load settings. Showing defaults.');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await client.put('/admin/config', {
        pricePerSlot: Number(form.pricePerSlot),
        slotDuration: Number(form.slotDuration),
        platformCommission: Number(form.platformCommission),
      });
      setSuccess('Rental configuration updated successfully.');
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white">Settings</h3>
        <p className="mt-1 text-sm text-slate-400">Configure slot pricing, default rental durations, and platform commissions.</p>
      </div>
      {error ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-glow">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="pricePerSlot" className="mb-2 block text-sm font-medium text-slate-300">
              Price per slot (₹)
            </label>
            <input
              id="pricePerSlot"
              type="number"
              min="0"
              value={form.pricePerSlot}
              onChange={(event) => setForm((current) => ({ ...current, pricePerSlot: event.target.value }))}
              disabled={loading}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-gaming-500 focus:ring-gaming-500"
            />
          </div>
          <div>
            <label htmlFor="slotDuration" className="mb-2 block text-sm font-medium text-slate-300">
              Slot duration (minutes)
            </label>
            <input
              id="slotDuration"
              type="number"
              min="15"
              step="15"
              value={form.slotDuration}
              onChange={(event) => setForm((current) => ({ ...current, slotDuration: event.target.value }))}
              disabled={loading}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-gaming-500 focus:ring-gaming-500"
            />
          </div>
          <div>
            <label htmlFor="platformCommission" className="mb-2 block text-sm font-medium text-slate-300">
              Platform commission (%)
            </label>
            <input
              id="platformCommission"
              type="number"
              min="0"
              max="100"
              value={form.platformCommission}
              onChange={(event) => setForm((current) => ({ ...current, platformCommission: event.target.value }))}
              disabled={loading}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-gaming-500 focus:ring-gaming-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || saving}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gaming-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-gaming-500 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}

export default Settings;
