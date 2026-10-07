import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Clock, MessageSquare, ThumbsUp, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ReportIssueModal from '../components/ReportIssueModal';
import { Link } from 'react-router-dom';

interface Complaint {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  image_url: string | null;
  creator_id: string;
  profiles?: { full_name?: string | null } | null;
  upvotes_count: number;
  comments_count: number;
}

interface ComplaintRecord {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  image_url: string | null;
  creator_id: string;
  profiles?: Array<{ full_name?: string | null }> | { full_name?: string | null } | null;
  complaint_upvotes?: Array<{ user_id: string }> | null;
  comments?: Array<{ id: string }> | null;
}

export default function CivicFeed() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'unresolved'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'upvotes' | 'newest' | 'oldest'>('upvotes');
  const { user } = useAuth();

  const fetchComplaints = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          id,
          category,
          description,
          status,
          created_at,
          image_url,
          creator_id,
          profiles!complaints_creator_id_fkey (full_name),
          complaint_upvotes(user_id),
          comments(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: ComplaintRecord) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles ?? null;

        return {
          ...item,
          profiles: profile,
          upvotes_count: item.complaint_upvotes?.length || 0,
          comments_count: item.comments?.length || 0,
        };
      });

      setComplaints(formattedData);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchComplaints();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchComplaints]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Apply filters and sorting dynamically
  const displayedComplaints = complaints
    .filter(c => {
      if (filter === 'mine') return c.creator_id === user?.id;
      if (filter === 'unresolved') return c.status !== 'Resolved';
      return true;
    })
    .filter(c => selectedCategory === 'all' || c.category === selectedCategory)
    .sort((a, b) => {
      if (sortBy === 'upvotes') {
        return b.upvotes_count - a.upvotes_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
    });

  const activeReports = complaints.filter(item => item.status !== 'Resolved').length;
  const resolvedReports = complaints.filter(item => item.status === 'Resolved').length;
  const myReports = complaints.filter(item => item.creator_id === user?.id).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 overflow-hidden rounded-[28px] bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-[1px] shadow-[0_25px_60px_rgba(16,185,129,0.18)]">
        <div className="rounded-[27px] bg-slate-950/90 px-5 py-6 text-white sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100">
                Community Pulse
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Keep the city moving forward.</h1>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <Plus size={16} className="mr-2" /> Report an issue
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Active reports</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">{activeReports}</span>
            <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-600">Urgent</span>
          </div>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Resolved</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">{resolvedReports}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">On track</span>
          </div>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">My reports</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">{myReports}</span>
            <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-700">Mine</span>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3 w-full">
        <div className="flex flex-shrink-0 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 rounded-xl px-4 py-1.5 text-sm font-medium transition-all sm:flex-none ${filter === 'all' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
          >
            All Reports
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`flex-1 rounded-xl px-4 py-1.5 text-sm font-medium transition-all sm:flex-none ${filter === 'mine' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
          >
            My Reports
          </button>
          <button
            onClick={() => setFilter('unresolved')}
            className={`flex-1 rounded-xl px-4 py-1.5 text-sm font-medium transition-all sm:flex-none ${filter === 'unresolved' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
          >
            Unresolved
          </button>
        </div>

        <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white/90 px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent pr-6 text-sm font-medium text-slate-700 focus:outline-none dark:text-slate-200"
          >
            <option value="all" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">All Categories</option>
            <option value="Litter" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Litter</option>
            <option value="Overflowing Bin" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Overflowing Bin</option>
            <option value="E-Waste" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">E-Waste</option>
            <option value="Bio-Medical" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Bio-Medical</option>
            <option value="Construction Debris" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Construction Debris</option>
            <option value="Dead Animal" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Dead Animal</option>
            <option value="Illegal Dumping" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Illegal Dumping</option>
            <option value="Hazardous" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Hazardous</option>
            <option value="Other" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Other</option>
          </select>
        </div>

        <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white/90 px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <ArrowUpDown size={16} className="mr-2 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'upvotes' | 'newest' | 'oldest')}
            className="bg-transparent pr-6 text-sm font-medium text-slate-700 focus:outline-none dark:text-slate-200"
          >
            <option value="upvotes" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Most Liked</option>
            <option value="newest" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Newest First</option>
            <option value="oldest" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Oldest First</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-[24px] border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 h-36"></div>
          ))}
        </div>
      ) : displayedComplaints.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <MessageSquare size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">All clear for now</h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">No matching issues have been reported in your current view.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {displayedComplaints.map((complaint) => (
            <Link
              key={complaint.id}
              to={`/complaint/${complaint.id}`}
              className="group block rounded-[26px] border border-slate-200 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_40px_rgba(16,185,129,0.10)] dark:border-slate-700 dark:bg-slate-900/75"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg font-bold text-white shadow-md shadow-emerald-500/20">
                    {complaint.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-white">{complaint.category}</h3>
                    <p className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <Clock size={12} className="mr-1.5" />
                      {formatDate(complaint.created_at)}
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                  complaint.status === 'Resolved'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : complaint.status === 'In Progress'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
                      : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
                }`}>
                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                    complaint.status === 'Resolved'
                      ? 'bg-emerald-500'
                      : complaint.status === 'In Progress'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`} />
                  {complaint.status}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {complaint.description}
              </p>

              {complaint.image_url && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 aspect-video dark:border-slate-700 dark:bg-slate-950">
                  <img src={complaint.image_url} alt="Issue evidence" className="h-full w-full object-cover" />
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
                <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <ThumbsUp size={15} className="mr-1.5" />
                  {complaint.upvotes_count} Upvotes
                </div>
                <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <MessageSquare size={15} className="mr-1.5" />
                  {complaint.comments_count} Comments
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_18px_36px_rgba(16,185,129,0.35)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_42px_rgba(16,185,129,0.42)]"
      >
        <Plus size={24} className="transition-transform duration-300 group-hover:rotate-90" />
      </button>

      <ReportIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchComplaints}
      />
    </div>
  );
}
