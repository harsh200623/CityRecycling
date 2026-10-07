import { useEffect } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Trash2, Map, LayoutList, Shield, ClipboardList, Settings as SettingsIcon, Trophy } from 'lucide-react';

export default function AppLayout() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all border ${
      isActive
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-300'
        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/80 dark:hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-['Outfit'] transition-colors relative overflow-x-hidden">
      <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-emerald-300/25 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-5%] right-[-6%] h-80 w-80 rounded-full bg-cyan-300/20 blur-[120px] pointer-events-none z-0"></div>

      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/75">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                <Trash2 size={22} />
              </div>

              <div className="min-w-0 hidden sm:block">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                  city operations
                </div>
                <div className="truncate text-base font-bold text-slate-900 dark:text-white">
                  Urban Refuse
                </div>
              </div>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <NavLink to="/" className={navClass} end>
                <LayoutList size={17} />
                <span>Feed</span>
              </NavLink>

              <NavLink to="/map" className={navClass}>
                <Map size={17} />
                <span>Map</span>
              </NavLink>

              <NavLink to="/leaderboard" className={navClass}>
                <Trophy size={17} />
                <span>Leaderboard</span>
              </NavLink>

              {profile?.role === 'admin' && (
                <NavLink to="/admin" className={navClass}>
                  <Shield size={17} />
                  <span>Admin Panel</span>
                </NavLink>
              )}

              {profile?.role === 'collector' && (
                <NavLink to="/collector" className={navClass}>
                  <ClipboardList size={17} />
                  <span>My Tasks</span>
                </NavLink>
              )}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {profile?.full_name || user.email}
                </span>
                <span className="text-[11px] font-medium capitalize text-emerald-600 dark:text-emerald-400">
                  {profile?.role || 'Citizen'}
                </span>
              </div>

              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                    isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
                  }`
                }
                title="Settings"
              >
                <SettingsIcon size={18} />
              </NavLink>
            </div>
          </div>
        </div>

        <div className="md:hidden border-t border-slate-200/80 bg-white/80 px-3 py-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <NavLink to="/" className={navClass} end>
              <LayoutList size={17} />
              <span>Feed</span>
            </NavLink>
            <NavLink to="/map" className={navClass}>
              <Map size={17} />
              <span>Map</span>
            </NavLink>
            <NavLink to="/leaderboard" className={navClass}>
              <Trophy size={17} />
              <span>Rankings</span>
            </NavLink>
            {profile?.role === 'admin' && (
              <NavLink to="/admin" className={navClass}>
                <Shield size={17} />
                <span>Admin</span>
              </NavLink>
            )}
            {profile?.role === 'collector' && (
              <NavLink to="/collector" className={navClass}>
                <ClipboardList size={17} />
                <span>Tasks</span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
}
