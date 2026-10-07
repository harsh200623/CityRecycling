import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon, type LocationEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { MapPin, Trash2, Clock, CheckCircle } from 'lucide-react';

interface LocationItem {
  id: string;
  type: 'complaint' | 'dustbin';
  lat: number;
  lng: number;
  status?: string;
  category?: string;
  description?: string;
  address?: string;
}

function LocationLocator() {
  const map = useMap();
  const hasLocatedRef = useRef(false);

  useEffect(() => {
    map.locate({ enableHighAccuracy: true, watch: true, maximumAge: 30000 });

    const onFound = (e: LocationEvent) => {
      if (hasLocatedRef.current) return;

      hasLocatedRef.current = true;
      map.flyTo(e.latlng, 15);
      map.stopLocate();
    };

    map.on('locationfound', onFound);

    const timeoutId = setTimeout(() => {
      map.stopLocate();
    }, 20000);

    return () => {
      clearTimeout(timeoutId);
      map.stopLocate();
      map.off('locationfound', onFound);
    };
  }, [map]);

  return null;
}

export default function MapView() {
  const [items, setItems] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Bengaluru coordinates as default center
  const defaultCenter = [12.9716, 77.5946] as [number, number];

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const [complaintsRes, dustbinsRes] = await Promise.all([
          supabase.from('complaints').select('*'),
          supabase.from('dustbins').select('*')
        ]);

        const formattedItems: LocationItem[] = [];

        if (complaintsRes.data) {
          formattedItems.push(...complaintsRes.data.map(c => ({
            id: `c_${c.id}`,
            type: 'complaint' as const,
            lat: c.location_lat,
            lng: c.location_lng,
            status: c.status,
            category: c.category,
            description: c.description
          })));
        }

        if (dustbinsRes.data) {
          formattedItems.push(...dustbinsRes.data.map(d => ({
            id: `d_${d.id}`,
            type: 'dustbin' as const,
            lat: d.location_lat,
            lng: d.location_lng,
            address: d.address
          })));
        }

        setItems(formattedItems);
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, []);

  const createCustomIcon = (type: 'complaint' | 'dustbin', status?: string) => {
    if (type === 'dustbin') {
      const colorClass = 'bg-blue-600 text-white';
      const iconHtml = `<div class="w-8 h-8 ${colorClass} rounded-full flex items-center justify-center shadow-lg border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg></div>`;

      return divIcon({
        className: 'custom-leaflet-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    }

    const colorClass = status === 'Pending' ? 'bg-red-500' : status === 'In Progress' ? 'bg-yellow-500' : 'bg-emerald-500';
    const iconHtml = `<div class="w-6 h-6 ${colorClass} rounded-full shadow-md border-2 border-white animate-pulse"></div>`;

    return divIcon({
      className: 'custom-leaflet-icon',
      html: iconHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative z-0 dark:bg-slate-900">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        className="h-full w-full"
        zoomControl={false}
      >
        <LocationLocator />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {items.map(item => (
          <Marker 
            key={item.id} 
            position={[item.lat, item.lng]} 
            icon={createCustomIcon(item.type, item.status)}
          >
            <Popup className="rounded-xl dark:bg-slate-800">
              <div className="p-2 w-48 dark:text-white">
                {item.type === 'dustbin' ? (
                  <>
                    <div className="flex items-center text-blue-600 mb-2">
                      <Trash2 size={18} className="mr-2" />
                      <h3 className="font-semibold text-base">Public Dustbin</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{item.address || 'Stationary Bin'}</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center mb-2">
                      {item.status === 'Resolved' ? (
                        <CheckCircle size={18} className="text-emerald-500 mr-2" />
                      ) : item.status === 'In Progress' ? (
                        <Clock size={18} className="text-yellow-500 mr-2" />
                      ) : (
                        <MapPin size={18} className="text-red-500 mr-2" />
                      )}
                      <h3 className="font-semibold text-base text-gray-800">{item.category}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.status === 'Pending' ? 'bg-red-100 text-red-800' :
                      item.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.status}
                    </span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-100 z-[1000]">
        <h4 className="text-sm font-bold text-gray-800 mb-3">Map Legend</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-red-500 border border-white shadow-sm mr-2"></div> Pending Issue</div>
          <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-yellow-500 border border-white shadow-sm mr-2"></div> In Progress</div>
          <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-emerald-500 border border-white shadow-sm mr-2"></div> Resolved</div>
          <div className="flex items-center mt-2 pt-2 border-t border-gray-200">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center mr-2"><Trash2 size={10} className="text-white"/></div> 
            Public Dustbin
          </div>
        </div>
      </div>
    </div>
  );
}
