import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, MapPin, Trash2, Users, ArrowUpDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Complaint {
  id: string;
  status: string;
  created_at: string;
  category: string;
  description?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  collector?: { full_name?: string | null } | null;
}

interface Profile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  created_at: string;
  role?: string | null;
}

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'dustbins'>('overview');

  // Overview Filters
  const [filter, setFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // New Dustbin Form
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [message, setMessage] = useState('');

  const fetchComplaints = useCallback(async () => {
    const { data } = await supabase
      .from('complaints')
      .select('*, profiles!complaints_creator_id_fkey(full_name, email), collector:profiles!complaints_assigned_collector_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    if (data) setComplaints(data as Complaint[]);
  }, []);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProfiles(data as Profile[]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchComplaints();
      void fetchProfiles();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchComplaints, fetchProfiles]);

  const handleAddDustbin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('dustbins')
        .insert([{ location_lat: parseFloat(lat), location_lng: parseFloat(lng), created_by: user?.id }]);
      if (error) throw error;
      setMessage('Dustbin added successfully!');
      setLat('');
      setLng('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Error: ${message}`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      void fetchProfiles();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error updating role: ${message}`);
    }
  };

  const displayedComplaints = complaints
    .filter(c => {
      if (filter === 'resolved') return c.status === 'Resolved';
      if (filter === 'unresolved') return c.status !== 'Resolved';
      return true;
    })
    .filter(c => selectedCategory === 'all' || c.category === selectedCategory)
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
    });

  const downloadExcel = () => {
    let data: Array<Record<string, string | number>>;

    if (activeTab === 'overview') {
      data = displayedComplaints.map(c => ({
        ID: c.id,
        Status: c.status,
        'Date Reported': new Date(c.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        Category: c.category,
        Description: c.description || 'N/A',
        'Location (Lat, Lng)': `${c.location_lat ?? 'N/A'}, ${c.location_lng ?? 'N/A'}`,
        'Reported By': c.profiles?.full_name || 'Citizen',
        Email: c.profiles?.email || 'N/A',
        'Assigned Collector': c.collector?.full_name || 'Unassigned',
      }));
    } else if (activeTab === 'users') {
      data = profiles.map(p => ({
        ID: p.id,
        Name: p.full_name || 'Unknown User',
        Email: p.email || 'N/A',
        'Joined Date': new Date(p.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        Role: p.role || 'Citizen',
      }));
    } else {
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'overview' ? 'Issues Data' : 'Users Data');

    XLSX.writeFile(workbook, `UrbanRefuse_${activeTab}_export.xlsx`);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 animate-fade-in font-['Outfit'] transition-colors">
      <div className="flex items-center space-x-3 mb-2">
        <Shield size={32} className="text-emerald-600 dark:text-emerald-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Control Center</h1>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 dark:border-slate-700">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'overview' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Issues Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'users' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('dustbins')}
            className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'dustbins' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Manage Dustbins
          </button>
        </div>
        
        {(activeTab === 'overview' || activeTab === 'users') && (
          <button 
            onClick={downloadExcel}
            className="flex items-center mt-2 sm:mt-0 mb-2 sm:mb-0 px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 shadow-sm"
          >
            <Download size={16} className="mr-2" />
            Export to Excel
          </button>
        )}
      </div>

      {/* Tab Content */}
      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/5 overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">All Reports</h2>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Filter */}
              <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-1 shadow-sm">
                <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>All</button>
                <button onClick={() => setFilter('resolved')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'resolved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Resolved</button>
                <button onClick={() => setFilter('unresolved')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'unresolved' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Unresolved</button>
              </div>
              
              {/* Category Filter */}
              <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-1.5 shadow-sm">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer appearance-none pr-4"
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

              {/* Sort */}
              <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-1.5 shadow-sm">
                <ArrowUpDown size={14} className="text-gray-400 mr-2" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                  className="bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer appearance-none pr-4"
                >
                  <option value="newest" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Newest First</option>
                  <option value="oldest" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Reported</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reported By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collector</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {displayedComplaints.map((complaint) => (
                  <tr key={complaint.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        complaint.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                        complaint.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {complaint.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(complaint.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {complaint.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {complaint.profiles?.full_name || 'Citizen'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {complaint.profiles?.email || <span className="italic opacity-50">Not Synced</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {complaint.collector ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{complaint.collector.full_name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayedComplaints.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">No reports found.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/5 overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center text-gray-900 dark:text-white">
              <Users className="mr-2 text-emerald-500" size={20} />
              Platform Users
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {profile.full_name || 'Unknown User'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {profile.email || <span className="italic opacity-50">Not Synced</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        value={profile.role ?? 'citizen'}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                        className={`text-xs font-bold rounded-full px-3 py-1 outline-none border-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                          profile.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          profile.role === 'collector' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <option value="citizen">Citizen</option>
                        <option value="collector">Collector</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Dustbins */}
      {activeTab === 'dustbins' && (
        <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/5 p-6 sm:p-8 max-w-lg transition-colors">
          <div className="flex items-center mb-6 text-emerald-600 dark:text-emerald-500">
            <Trash2 size={24} className="mr-2" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Public Dustbin</h2>
          </div>
          
          <form onSubmit={handleAddDustbin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                placeholder="e.g. 12.9716"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                placeholder="e.g. 77.5946"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm mt-2"
            >
              <MapPin size={18} className="mr-2" />
              Place Dustbin on Map
            </button>
            
            {message && (
              <div className={`p-3 rounded-lg text-sm mt-4 ${message.includes('Error') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                {message}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
