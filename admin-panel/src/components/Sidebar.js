import { Coins, Gauge, MonitorPlay, Settings, ShieldAlert, Users, WalletCards, Wifi, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Dashboard', to: '/dashboard', icon: Gauge },
  { name: 'Hosts', to: '/hosts', icon: MonitorPlay },
  { name: 'Users', to: '/users', icon: Users },
  { name: 'Sessions', to: '/sessions', icon: Wifi },
  { name: 'Transactions', to: '/transactions', icon: WalletCards },
  { name: 'Tokens', to: '/tokens', icon: Coins },
  { name: 'Complaints', to: '/complaints', icon: ShieldAlert },
  { name: 'Settings', to: '/settings', icon: Settings },
];

const getNavClassName = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
    isActive
      ? 'bg-gaming-600/30 text-white shadow-glow'
      : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
  }`;

function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="flex h-screen w-[250px] flex-col border-r border-slate-800 bg-slate-950/95 px-5 py-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gaming-300">P2P Cloud</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Gaming Admin</h1>
        <p className="mt-2 text-sm text-slate-400">Moderate hosts, sessions, revenue, and disputes.</p>
      </div>

      <nav className="mt-8 flex-1 space-y-2">
        {navItems.map(({ name, to, icon: Icon }) => (
          <NavLink key={name} to={to} className={getNavClassName}>
            <Icon size={18} />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={logout}
        className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-gaming-500/40 hover:text-white"
      >
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
