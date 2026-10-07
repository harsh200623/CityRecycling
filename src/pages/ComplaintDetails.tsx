import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Clock, ArrowLeft, MessageSquare, ThumbsUp, Send } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ComplaintDetail {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  image_url?: string | null;
  resolution_image_url?: string | null;
  resolution_notes?: string | null;
  location_lat: number;
  location_lng: number;
  profiles?: { full_name?: string | null; phone?: string | null } | null;
  collector?: { full_name?: string | null } | null;
}

interface CommentItem {
  id: string;
  created_at: string;
  text: string;
  profiles?: { full_name?: string | null } | null;
}

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ComplaintDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [upvotes, setUpvotes] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    if (!id) return;

    try {
      const { data: complaintData, error: cError } = await supabase
        .from('complaints')
        .select('*, profiles!complaints_creator_id_fkey(full_name, phone), collector:profiles!complaints_assigned_collector_id_fkey(full_name)')
        .eq('id', id)
        .single();
      if (cError) throw cError;
      setComplaint(complaintData as ComplaintDetail);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles(full_name)')
        .eq('complaint_id', id)
        .order('created_at', { ascending: true });
      setComments((commentsData || []) as CommentItem[]);

      const { data: upvotesData } = await supabase
        .from('complaint_upvotes')
        .select('user_id')
        .eq('complaint_id', id);

      if (upvotesData) {
        setUpvotes(upvotesData.length);
        setHasUpvoted(upvotesData.some((u: { user_id: string | null }) => u.user_id === user?.id));
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;

    const timer = window.setTimeout(() => {
      void fetchDetails();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [id, fetchDetails]);

  const handleUpvote = async () => {
    if (!user) return;
    try {
      if (hasUpvoted) {
        await supabase.from('complaint_upvotes').delete().match({ complaint_id: id, user_id: user.id });
        setUpvotes(prev => prev - 1);
        setHasUpvoted(false);
      } else {
        await supabase.from('complaint_upvotes').insert([{ complaint_id: id, user_id: user.id }]);
        setUpvotes(prev => prev + 1);
        setHasUpvoted(true);
      }
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{ complaint_id: id, user_id: user.id, text: newComment.trim() }]);
      if (error) throw error;
      setNewComment('');
      void fetchDetails();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!complaint) {
    return <div className="p-8 text-center text-gray-500">Complaint not found.</div>;
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 animate-fade-in font-['Outfit']">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft size={16} className="mr-1" /> Back
      </button>

      {/* Main Details Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold mb-3 inline-block ${
                  complaint.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  complaint.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                {complaint.status}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{complaint.category}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 dark:text-gray-400 space-y-2 sm:space-y-0 sm:space-x-4">
                <span className="flex items-center"><Clock size={14} className="mr-1.5" /> {new Date(complaint.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="flex items-center"><MapPin size={14} className="mr-1.5 text-emerald-500" /> Exact Location Tagged</span>
              </div>
            </div>
            
            <button 
              onClick={handleUpvote}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${hasUpvoted ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600'}`}
            >
              <ThumbsUp size={20} className={hasUpvoted ? 'fill-emerald-600 dark:fill-emerald-400' : ''} />
              <span className="font-bold text-lg mt-1 leading-none">{upvotes}</span>
            </button>
          </div>

          <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
            {complaint.description}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-6">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg inline-flex">
              Reported by <strong className="ml-1 text-gray-900 dark:text-gray-200">{complaint.profiles?.full_name || 'Citizen'}</strong>
            </div>
            {(profile?.role === 'admin' || profile?.role === 'collector') && complaint.profiles?.phone && (
              <div className="flex items-center mt-2 sm:mt-0 text-sm text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg inline-flex">
                📞 {complaint.profiles.phone}
              </div>
            )}
          </div>

          {/* Interactive Map */}
          <div className="mb-6 space-y-2">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Location</h3>
            <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 relative z-0">
              <MapContainer 
                center={[complaint.location_lat, complaint.location_lng]} 
                zoom={16} 
                className="h-full w-full"
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[complaint.location_lat, complaint.location_lng]} />
              </MapContainer>
            </div>
          </div>

          {/* Before & After Photos */}
          {(complaint.image_url || complaint.resolution_image_url) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {complaint.image_url && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Reported Issue</h3>
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 h-64 bg-gray-100 dark:bg-slate-900">
                    <img src={complaint.image_url} alt="Before" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              {complaint.resolution_image_url && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-emerald-500 uppercase tracking-wider">Resolution Proof</h3>
                  <div className="rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-900 h-64 bg-emerald-50 dark:bg-emerald-900/10">
                    <img src={complaint.resolution_image_url} alt="After" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resolution Notes */}
          {complaint.resolution_notes && (
            <div className="mt-8 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-5">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400 mb-2">Collector's Resolution Notes</h3>
              <p className="text-emerald-700 dark:text-emerald-300">{complaint.resolution_notes}</p>
              <div className="mt-2 text-sm text-emerald-600/70 dark:text-emerald-400/70 font-medium">
                — Resolved by {complaint.collector?.full_name || 'Collector'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-bold flex items-center mb-6 text-gray-900 dark:text-white">
            <MessageSquare size={20} className="mr-2 text-emerald-500" />
            Community Discussion ({comments.length})
          </h2>

          <div className="space-y-6 mb-8">
            {comments.map(comment => (
              <div key={comment.id} className="flex space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 shrink-0">
                  {comment.profiles?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 bg-gray-50 dark:bg-slate-900/50 rounded-2xl rounded-tl-none p-4 border border-gray-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-200">{comment.profiles?.full_name || 'Citizen'}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4 italic">No comments yet. Be the first to discuss this issue!</p>
            )}
          </div>

          <form onSubmit={submitComment} className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-medium transition-colors flex items-center"
            >
              <Send size={18} className="mr-2 hidden sm:block" /> Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
