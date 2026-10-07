import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // On mount, verify the user actually arrived with a valid recovery token.
  // Supabase automatically parses the URL hash (#access_token=...) and logs them in temporarily.
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Invalid or expired password reset link. Please request a new one.");
      }
    };
    checkUser();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-['Outfit'] relative p-4">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl relative z-10 animate-fade-in border border-slate-100">
        <div className="flex items-center space-x-3 mb-8 justify-center">
          <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-600/30">
            <Leaf size={28} className="text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">Urban Refuse</span>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Updated!</h2>
            <p className="text-slate-500 mb-6">Your password has been changed successfully.</p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Update Password</h2>
              <p className="text-slate-500 text-sm">Enter your new strong password below.</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="group">
                <label className="block text-sm font-medium text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!error?.includes('Invalid or expired')}
                className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2 h-5 w-5 text-white" />
                ) : (
                  <>
                    Save Password
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
