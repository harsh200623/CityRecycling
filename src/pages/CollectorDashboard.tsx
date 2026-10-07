import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, Save, Hand, MapPin, Camera, X, Clock, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type TaskStatus = 'Pending' | 'In Progress' | 'Resolved';

interface TaskRecord {
  id: string;
  category: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  image_url?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  profiles?: { full_name?: string | null; phone?: string | null } | null;
  complaint_upvotes?: Array<{ user_id: string }> | null;
  resolution_notes?: string | null;
  resolution_image_url?: string | null;
  upvotes_count: number;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
      {message}
    </div>
  );
}

export default function CollectorDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [availableTasks, setAvailableTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'available'>('my_tasks');
  const [sortMyTasks, setSortMyTasks] = useState<'newest' | 'oldest' | 'upvotes'>('newest');
  const [sortAvailable, setSortAvailable] = useState<'upvotes' | 'newest' | 'oldest'>('upvotes');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchMyTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, profiles!complaints_creator_id_fkey(full_name, phone), complaint_upvotes(user_id)')
        .eq('assigned_collector_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const formattedData = (data || []).map((item: TaskRecord) => ({
        ...item,
        upvotes_count: item.complaint_upvotes?.length || 0,
      }));
      setTasks(formattedData);
    } catch (error) {
      console.error('Error fetching my tasks:', error);
    }
  };

  const fetchAvailableTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, profiles!complaints_creator_id_fkey(full_name, phone), complaint_upvotes(user_id)')
        .is('assigned_collector_id', null)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: TaskRecord) => ({
        ...item,
        upvotes_count: item.complaint_upvotes?.length || 0,
      }));

      setAvailableTasks(formattedData);
    } catch (error) {
      console.error('Error fetching available tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [{ data: myData, error: myError }, { data: availableData, error: availableError }] = await Promise.all([
            supabase
              .from('complaints')
              .select('*, profiles!complaints_creator_id_fkey(full_name, phone), complaint_upvotes(user_id)')
              .eq('assigned_collector_id', user.id)
              .order('created_at', { ascending: false }),
            supabase
              .from('complaints')
              .select('*, profiles!complaints_creator_id_fkey(full_name, phone), complaint_upvotes(user_id)')
              .is('assigned_collector_id', null)
              .eq('status', 'Pending')
              .order('created_at', { ascending: false }),
          ]);

          if (myError) throw myError;
          if (availableError) throw availableError;

          setTasks((myData || []).map((item: TaskRecord) => ({ ...item, upvotes_count: item.complaint_upvotes?.length || 0 })));
          setAvailableTasks((availableData || []).map((item: TaskRecord) => ({ ...item, upvotes_count: item.complaint_upvotes?.length || 0 })));
        } catch (error) {
          console.error('Unable to load collector tasks:', error);
        } finally {
          setLoading(false);
        }
      })();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user]);

  const handleClaim = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ assigned_collector_id: user?.id, status: 'In Progress' })
        .eq('id', taskId);

      if (error) throw error;
      void fetchMyTasks();
      void fetchAvailableTasks();
      setActiveTab('my_tasks');
    } catch (error) {
      console.error('Error claiming task:', error);
      alert('Failed to claim task.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const displayedMyTasks = [...tasks]
    .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
    .sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (sortMyTasks === 'upvotes') {
        return (b.upvotes_count || 0) - (a.upvotes_count || 0) || timeB - timeA;
      }
      if (sortMyTasks === 'newest') {
        return timeB - timeA;
      }
      return timeA - timeB;
    });

  const displayedAvailableTasks = [...availableTasks]
    .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
    .sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (sortAvailable === 'upvotes') {
        return (b.upvotes_count || 0) - (a.upvotes_count || 0) || timeB - timeA;
      }
      if (sortAvailable === 'newest') {
        return timeB - timeA;
      }
      return timeA - timeB;
    });

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ClipboardList size={32} className="text-emerald-600 dark:text-emerald-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Collector Hub</h1>
        </div>
        <div className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300">
          {tasks.filter(t => t.status === 'Resolved').length} / {tasks.length} Resolved
        </div>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-200 sm:flex-row sm:items-center dark:border-slate-700">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'my_tasks' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            My Assigned Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'available' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            Available Task Pool ({availableTasks.length})
          </button>
        </div>

        <div className="mb-2 flex flex-col space-y-2 sm:mb-0 sm:flex-row sm:space-x-3 sm:space-y-0">
          <div className="relative flex items-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="cursor-pointer appearance-none bg-transparent pr-4 text-sm font-medium text-gray-700 focus:outline-none dark:text-gray-300"
            >
              <option value="all" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">All Categories</option>
              <option value="Litter" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Litter</option>
              <option value="Overflowing Bin" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Overflowing Bin</option>
              <option value="E-Waste" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">E-Waste</option>
              <option value="Bio-Medical" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Bio-Medical</option>
              <option value="Construction Debris" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Construction Debris</option>
              <option value="Dead Animal" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Dead Animal</option>
              <option value="Illegal Dumping" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Illegal Dumping</option>
              <option value="Hazardous" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Hazardous</option>
              <option value="Other" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Other</option>
            </select>
          </div>

          <div className="relative flex items-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <ArrowUpDown size={16} className="mr-2 text-gray-400" />
            <select
              value={activeTab === 'my_tasks' ? sortMyTasks : sortAvailable}
              onChange={(e) => {
                const value = e.target.value as 'upvotes' | 'newest' | 'oldest';
                if (activeTab === 'my_tasks') {
                  setSortMyTasks(value);
                } else {
                  setSortAvailable(value);
                }
              }}
              className="cursor-pointer appearance-none bg-transparent pr-4 text-sm font-medium text-gray-700 focus:outline-none dark:text-gray-300"
            >
              <option value="upvotes" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Most Rated</option>
              <option value="newest" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Newest First</option>
              <option value="oldest" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === 'my_tasks' && (
          <div key={sortMyTasks}>
            {displayedMyTasks.map((task) => (
              <div key={task.id} className="mb-6">
                <TaskCard task={task} onUpdateComplete={fetchMyTasks} />
              </div>
            ))}
            {displayedMyTasks.length === 0 && <EmptyState message="You have no assigned tasks. Check the Available Pool!" />}
          </div>
        )}

        {activeTab === 'available' && (
          <div key={sortAvailable} className="grid grid-cols-1 gap-6">
            {displayedAvailableTasks.map((task) => (
              <AvailableTaskCard key={task.id} task={task} onClaim={() => void handleClaim(task.id)} />
            ))}
            {displayedAvailableTasks.length === 0 && (
              <div className="col-span-full">
                <EmptyState message="No pending issues available to claim right now." />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AvailableTaskCard({ task, onClaim }: { task: TaskRecord; onClaim: () => void }) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-start justify-between">
        <Link to={`/complaint/${task.id}`} className="text-lg font-bold text-gray-900 transition-colors hover:text-emerald-600 dark:text-white">
          {task.category}
        </Link>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          ⭐ {task.upvotes_count} Upvotes
        </span>
      </div>

      <div className="mb-4 space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center">
          <strong className="mr-1.5 text-gray-700 dark:text-gray-300">Reported by:</strong>
          {task.profiles?.full_name || 'Citizen'}
        </div>
        <div className="flex items-center">
          <Clock size={14} className="mr-1.5" />
          {task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date'}
        </div>
        <div className="flex items-center">
          <MapPin size={14} className="mr-1.5" />
          {task.location_lat?.toFixed(4) || 0}, {task.location_lng?.toFixed(4) || 0}
        </div>
        {task.profiles?.phone && (
          <div className="mt-1 inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            📞 {task.profiles.phone}
          </div>
        )}
      </div>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{task.description}</p>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {task.image_url ? (
          <div className="h-48 w-full overflow-hidden rounded-lg border border-gray-100 dark:border-slate-700">
            <img src={task.image_url} alt="Issue" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400 dark:border-slate-700 dark:bg-slate-900/50">
            No photo provided
          </div>
        )}

        <div className="relative z-0 h-48 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
          <MapContainer center={[task.location_lat ?? 0, task.location_lng ?? 0]} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[task.location_lat ?? 0, task.location_lng ?? 0]} />
          </MapContainer>
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={onClaim}
          className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <Hand size={18} className="mr-2" />
          Claim High Priority Task
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task, onUpdateComplete }: { task: TaskRecord; onUpdateComplete: () => void }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [notes, setNotes] = useState(task.resolution_notes || '');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resImageFile, setResImageFile] = useState<File | null>(null);
  const [resImagePreview, setResImagePreview] = useState<string | null>(task.resolution_image_url || null);

  const hasChanged = status !== task.status || notes !== (task.resolution_notes || '') || resImageFile !== null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setResImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!resImageFile) return null;
    const fileExt = resImageFile.name.split('.').pop();
    const fileName = `res_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('complaint_images').upload(filePath, resImageFile);
    if (uploadError) throw new Error(uploadError.message);
    const { data } = supabase.storage.from('complaint_images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      let finalResUrl = task.resolution_image_url || null;
      if (resImageFile) {
        finalResUrl = await uploadImage();
      }

      const { error } = await supabase
        .from('complaints')
        .update({ status, resolution_notes: notes, resolution_image_url: finalResUrl })
        .eq('id', task.id);

      if (error) throw error;
      onUpdateComplete();
      setResImageFile(null);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl border bg-white p-6 shadow-sm transition-all dark:bg-slate-800 ${task.status === 'Resolved' ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-900/10' : 'border-gray-100 dark:border-slate-700'}`}>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
        <div className="w-full shrink-0 md:w-1/3">
          <div className="mb-3">
            <Link to={`/complaint/${task.id}`} className="text-lg font-bold text-gray-900 transition-colors hover:text-emerald-600 dark:text-white">
              {task.category}
            </Link>
            <div className="mt-2 flex flex-col space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <strong className="mr-1.5 text-gray-700 dark:text-gray-300">Reported by:</strong>
                {task.profiles?.full_name || 'Citizen'}
              </div>
              <div className="flex items-center">
                <Clock size={14} className="mr-1.5" />
                {task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date'}
              </div>
              <div className="flex items-center">
                <MapPin size={14} className="mr-1" />
                {task.location_lat?.toFixed(4) || 0}, {task.location_lng?.toFixed(4) || 0}
              </div>
            </div>
            {task.profiles?.phone && (
              <div className="mt-2 inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                📞 {task.profiles.phone}
              </div>
            )}
          </div>

          {task.image_url ? (
            <div className="mb-4 h-40 w-full overflow-hidden rounded-xl border border-gray-100 shadow-sm dark:border-slate-700">
              <img src={task.image_url} alt="Issue" className="h-full w-full object-cover transition-transform hover:scale-105" />
            </div>
          ) : (
            <div className="mb-4 flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400 dark:border-slate-700 dark:bg-slate-900/50">
              No photo provided
            </div>
          )}

          <div className="relative z-0 mb-4 h-40 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
            <MapContainer center={[task.location_lat ?? 0, task.location_lng ?? 0]} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[task.location_lat ?? 0, task.location_lng ?? 0]} />
            </MapContainer>
          </div>
        </div>

        <div className="flex h-full flex-1 flex-col">
          <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-gray-300">
            <span className="mb-1 block font-semibold text-gray-900 dark:text-white">Citizen Description:</span>
            {task.description}
          </div>

          <div className="mb-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Resolution Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Cleared the overflowing bin and sanitized the area..."
                className="min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

            {status === 'Resolved' && (
              <div className="pt-2">
                <label className="mb-2 block text-sm font-medium text-emerald-700 dark:text-emerald-400">Proof of Resolution Photo</label>
                {resImagePreview ? (
                  <div className="relative inline-block h-32 w-48 overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
                    <img src={resImagePreview} alt="Resolution" className="h-full w-full object-cover" />
                    {resImageFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setResImageFile(null);
                          setResImagePreview(task.resolution_image_url || null);
                        }}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-max items-center justify-center rounded-lg border-2 border-dashed border-emerald-300 px-6 py-4 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  >
                    <Camera size={20} className="mr-2" /> Take / Upload Proof
                  </button>
                )}
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageChange} />
              </div>
            )}
          </div>

          <div className="mt-auto flex justify-end">
            <button
              onClick={() => void handleUpdate()}
              disabled={!hasChanged || loading}
              className={`flex items-center rounded-xl px-6 py-2.5 font-medium transition-all ${
                hasChanged
                  ? 'bg-emerald-600 text-white shadow-md hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-gray-500'
              }`}
            >
              <Save size={18} className="mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
