import { Gamepad2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { authError, authLoading, isAuthenticated, login } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [formError, setFormError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!credentials.email || !credentials.password) {
      setFormError('Email and password are required.');
      return;
    }

    setFormError('');
    const result = await login(credentials);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-panel p-8 shadow-glow lg:p-12">
          <p className="text-sm uppercase tracking-[0.35em] text-gaming-300">P2P Cloud Gaming Platform</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Admin control center for hosts, sessions, and payouts.</h1>
          <p className="mt-4 max-w-2xl text-slate-400">
            Track realtime activity, keep hosts compliant, and manage disputes without leaving your operations dashboard.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              { icon: Gamepad2, title: 'Monitor live sessions', description: 'Watch host utilization, active rentals, and renter session health.' },
              { icon: ShieldCheck, title: 'Review trust & safety', description: 'Verify hosts, handle complaints, and take action on suspicious activity.' },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4 inline-flex rounded-xl bg-gaming-600/20 p-3 text-gaming-300">
                  <Icon size={20} />
                </div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-glow">
          <p className="text-sm uppercase tracking-[0.35em] text-gaming-300">Secure sign in</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-400">Use your admin credentials to access the control panel.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                Admin email
              </label>
              <input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 focus:border-gaming-500 focus:ring-gaming-500"
                placeholder="admin@p2pgaming.dev"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 focus:border-gaming-500 focus:ring-gaming-500"
                placeholder="••••••••"
              />
            </div>

            {formError || authError ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {formError || authError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={authLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gaming-600 px-4 py-3 font-medium text-white transition hover:bg-gaming-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authLoading ? <LoaderCircle size={18} className="animate-spin" /> : null}
              <span>{authLoading ? 'Signing in...' : 'Login to admin panel'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
