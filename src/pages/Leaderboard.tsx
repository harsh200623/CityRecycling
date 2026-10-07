import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Medal, Award, Star } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  full_name: string;
  role: string;
  reports_count: number;
}

interface LeaderboardProfile {
  id: string;
  full_name?: string | null;
  role?: string | null;
  complaints?: Array<{ id: string }> | null;
}

export default function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          complaints!complaints_creator_id_fkey (id)
        `);

      if (error) throw error;

      const rankedUsers = (data || [])
        .map((user: LeaderboardProfile) => ({
          id: user.id,
          full_name: user.full_name || 'Citizen',
          role: user.role || 'Citizen',
          reports_count: user.complaints ? user.complaints.length : 0,
        }))
        .filter((user) => user.reports_count > 0)
        .sort((a, b) => b.reports_count - a.reports_count);

      setUsers(rankedUsers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLeaderboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={24} className="text-yellow-500 drop-shadow-md" />;
    if (index === 1) return <Medal size={24} className="text-gray-400 drop-shadow-md" />;
    if (index === 2) return <Medal size={24} className="text-amber-700 drop-shadow-md" />;
    return <span className="font-bold text-gray-400 text-lg">#{index + 1}</span>;
  };

  const topThree = users.slice(0, 3);
  const remainingUsers = users.slice(3);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fade-in font-['Outfit'] min-h-[calc(100vh-4rem)]">
      <div className="flex items-center space-x-3 mb-8">
        <Award size={36} className="text-emerald-600 dark:text-emerald-400" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Civic Leaderboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Top citizens keeping our city clean and beautiful.</p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
          <Star size={48} className="text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Reports Yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Be the first to report an issue and climb to the top of the leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium */}
          {topThree.length > 0 && (
            <div className="flex flex-row items-end justify-center gap-2 sm:gap-4 md:gap-8 mb-12 mt-8 md:mt-12 px-1">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center order-1 flex-1 max-w-[120px] md:max-w-[200px]">
                  <div className="relative mb-2 md:mb-4">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 md:border-4 border-gray-300 shadow-lg z-10 relative">
                      <span className="text-xl md:text-2xl font-bold text-gray-600 dark:text-gray-300">{topThree[1].full_name.charAt(0)}</span>
                    </div>
                    <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-gray-200 dark:bg-slate-600 rounded-full p-1 border-2 border-white dark:border-slate-800">
                      <Medal size={16} className="text-gray-500 md:w-5 md:h-5" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-center text-xs md:text-lg truncate w-full px-1">{topThree[1].full_name}</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] md:text-base">{topThree[1].reports_count} Reports</p>
                  <div className="w-full h-16 md:h-24 bg-gradient-to-t from-gray-200 to-gray-50 dark:from-slate-700 dark:to-slate-800 rounded-t-lg md:rounded-t-xl mt-2 md:mt-4 border-t-2 border-x-2 border-gray-300 dark:border-slate-600 flex items-center justify-center">
                    <span className="text-2xl md:text-3xl font-black text-gray-400/50 dark:text-slate-500/50">2</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <div className="flex flex-col items-center order-2 flex-1 max-w-[140px] md:max-w-[220px]">
                  <div className="relative mb-2 md:mb-4">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center border-2 md:border-4 border-yellow-200 shadow-xl z-10 relative">
                      <span className="text-2xl md:text-3xl font-bold text-yellow-900">{topThree[0].full_name.charAt(0)}</span>
                    </div>
                    <div className="absolute -bottom-3 md:-bottom-4 left-1/2 -translate-x-1/2 bg-yellow-100 dark:bg-slate-800 rounded-full p-1 md:p-1.5 border-2 border-white dark:border-slate-800 shadow-md">
                      <Trophy size={18} className="text-yellow-500 md:w-6 md:h-6" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-center text-sm md:text-xl mt-1 md:mt-2 truncate w-full px-1">{topThree[0].full_name}</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] md:text-lg">{topThree[0].reports_count} Reports</p>
                  <div className="w-full h-24 md:h-32 bg-gradient-to-t from-yellow-200 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-900/10 rounded-t-lg md:rounded-t-xl mt-2 md:mt-4 border-t-2 border-x-2 border-yellow-400 dark:border-yellow-700/50 flex items-center justify-center">
                    <span className="text-3xl md:text-5xl font-black text-yellow-500/30 dark:text-yellow-500/20">1</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center order-3 flex-1 max-w-[120px] md:max-w-[200px]">
                  <div className="relative mb-2 md:mb-4">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-amber-50 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 md:border-4 border-amber-600/40 shadow-lg z-10 relative">
                      <span className="text-xl md:text-2xl font-bold text-amber-800 dark:text-amber-500">{topThree[2].full_name.charAt(0)}</span>
                    </div>
                    <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-amber-100 dark:bg-slate-600 rounded-full p-1 border-2 border-white dark:border-slate-800">
                      <Medal size={16} className="text-amber-700 md:w-5 md:h-5" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-center text-xs md:text-lg truncate w-full px-1">{topThree[2].full_name}</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] md:text-base">{topThree[2].reports_count} Reports</p>
                  <div className="w-full h-12 md:h-20 bg-gradient-to-t from-amber-100 to-orange-50 dark:from-slate-700 dark:to-slate-800 rounded-t-lg md:rounded-t-xl mt-2 md:mt-4 border-t-2 border-x-2 border-amber-600/30 dark:border-slate-600 flex items-center justify-center">
                    <span className="text-2xl md:text-3xl font-black text-amber-600/20 dark:text-slate-500/50">3</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List for 4th and beyond */}
          {remainingUsers.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Honorable Mentions</h2>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                {remainingUsers.map((user, index) => (
                  <li key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 flex justify-center">
                        {getRankIcon(index + 3)}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                          {user.full_name.charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{user.full_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{user.reports_count}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">Reports</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
