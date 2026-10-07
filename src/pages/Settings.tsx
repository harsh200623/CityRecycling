import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Moon, Sun, LogOut, Save } from 'lucide-react';

export default function Settings() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone })
        .eq('id', user?.id);

      if (error) throw error;
      setMessage('Profile updated successfully! Refresh to see changes globally.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      setMessage(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8 animate-fade-in font-['Outfit'] dark:text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your account preferences and application appearance.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Profile Section */}
          <section>
            <h2 className="text-xl font-bold flex items-center mb-4 text-gray-800 dark:text-gray-100">
              <User className="mr-2 text-emerald-500" size={24} />
              Personal Information
            </h2>
            <form onSubmit={updateProfile} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  disabled 
                  value={user?.email || ''} 
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 234 567 8900"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center justify-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <Save size={18} className="mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                  {message}
                </div>
              )}
            </form>
          </section>

          <hr className="border-gray-100 dark:border-slate-700" />

          {/* Appearance Section */}
          <section>
            <h2 className="text-xl font-bold flex items-center mb-4 text-gray-800 dark:text-gray-100">
              {isDark ? <Moon className="mr-2 text-indigo-400" size={24} /> : <Sun className="mr-2 text-orange-400" size={24} />}
              Appearance
            </h2>
            <div className="flex items-center justify-between max-w-md p-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark themes.</p>
              </div>
              <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isDark ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          <hr className="border-gray-100 dark:border-slate-700" />

          {/* Account Section */}
          <section>
            <h2 className="text-xl font-bold flex items-center mb-4 text-red-600 dark:text-red-400">
              Account Actions
            </h2>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="flex items-center px-6 py-2.5 border-2 border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium transition-all"
            >
              <LogOut size={18} className="mr-2" />
              Sign Out Securely
            </button>
          </section>

        </div>
      </div>
    </div>
  );
}
