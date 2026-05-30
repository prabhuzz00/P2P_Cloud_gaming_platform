import { Bell, Search } from 'lucide-react';
import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

const pageTitles = {
  '/dashboard': 'Platform overview',
  '/hosts': 'Host management',
  '/users': 'User management',
  '/sessions': 'Session monitoring',
  '/transactions': 'Transaction ledger',
  '/tokens': 'Token management',
  '/complaints': 'Complaint handling',
  '/settings': 'Platform settings',
};

function Layout() {
  const location = useLocation();
  const { adminUser, logout } = useAuth();

  const pageTitle = useMemo(() => pageTitles[location.pathname] || 'Admin panel', [location.pathname]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col bg-panel">
        <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/70 px-8 py-5 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-gaming-300">Admin console</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">{pageTitle}</h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-slate-400">
                <Search size={16} />
                <span className="text-sm">Review hosts, earnings, and support queues</span>
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-slate-400 transition hover:text-white"
              >
                <Bell size={18} />
              </button>
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm">
                <p className="font-medium text-white">{adminUser?.name || 'Administrator'}</p>
                <p className="text-slate-400">{adminUser?.email || 'admin@p2pgaming.dev'}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl bg-gaming-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gaming-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
