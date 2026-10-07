import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Camera, Loader2, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issues in React
delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }: { position: [number, number]; setPosition: (pos: [number, number]) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : <Marker position={position}></Marker>;
}

export default function ReportIssueModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [category, setCategory] = useState('Litter');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location State
  const [location, setLocation] = useState<[number, number]>([12.9716, 77.5946]); // Default Bengaluru
  const [isLocating, setIsLocating] = useState(false);

  const handleAutoLocate = () => {
    setIsLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported by browser. Please tap the map to set location.');
      setIsLocating(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(timeoutId);
        setLocation([pos.coords.latitude, pos.coords.longitude]);
        setIsLocating(false);
        setError(null);
      },
      (err) => {
        if (err.code === 1) {
          navigator.geolocation.clearWatch(watchId);
          clearTimeout(timeoutId);
          setError('Location permission denied by your browser.');
          setIsLocating(false);
        }
      },
      { enableHighAccuracy: true, maximumAge: 30000 }
    );

    const timeoutId = setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      setError('Could not get your location. Please tap the map to set it manually.');
      setIsLocating(false);
    }, 20000);
  };

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      handleAutoLocate();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('complaint_images')
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('complaint_images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const { error: insertError } = await supabase.from('complaints').insert([
        {
          creator_id: user.id,
          category,
          description,
          location_lat: location[0],
          location_lng: location[1],
          image_url: imageUrl,
          status: 'Pending',
        },
      ]);

      if (insertError) throw insertError;

      setCategory('Litter');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to submit: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-full animate-fade-in transition-colors">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Report an Issue</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
              >
                <option value="Litter">Litter / Sweeping Needed</option>
                <option value="Overflowing Bin">Overflowing Public Bin</option>
                <option value="E-Waste">E-Waste (Electronic Disposal Needed)</option>
                <option value="Bio-Medical">Bio-Medical / Unsafe Items</option>
                <option value="Construction Debris">Construction / Bulk Debris</option>
                <option value="Dead Animal">Dead Animal Disposal</option>
                <option value="Illegal Dumping">Illegal Dumping / Commercial Waste</option>
                <option value="Hazardous">Hazardous Waste</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Photo Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attach Photo</label>
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 bg-gray-50 h-[42px]">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-lg py-2 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300 text-sm"
                  >
                    <Camera size={18} className="mr-2 text-emerald-500" />
                    Upload
                  </button>
                  <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageChange} />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px] text-gray-900 dark:text-white text-sm"
              placeholder="Provide details about the issue..."
            />
          </div>

          {/* Location Map Picker */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Issue Location</label>
              <button 
                type="button" 
                onClick={handleAutoLocate}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center hover:underline"
              >
                {isLocating ? <Loader2 size={12} className="animate-spin mr-1" /> : <Navigation size={12} className="mr-1" />}
                Use Current Location
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tap anywhere on the map to manually set the pin if the location is incorrect.</p>
            <div className="h-48 w-full rounded-xl overflow-hidden border border-gray-300 dark:border-slate-600 relative z-0">
              <MapContainer center={location} zoom={15} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker position={location} setPosition={setLocation} />
              </MapContainer>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-md transition-colors flex items-center disabled:opacity-70"
            >
              {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
