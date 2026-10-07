import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { CircleHelp, Navigation } from 'lucide-react';
import { CATEGORY_ICONS } from '../icons.jsx';
import { STATUS_LABEL } from '../constants.js';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const CATEGORY_COLORS = {
  Infrastruktur: '#0ea5e9',
  Kebersihan: '#f97316',
  Penerangan: '#eab308',
  Banjir: '#3b82f6',
  Keamanan: '#ef4444',
  Lainnya: '#64748b'
};

function makeIcon(category) {
  const Icon = CATEGORY_ICONS[category] || CircleHelp;
  const svg = renderToStaticMarkup(<Icon size={16} strokeWidth={2.5} color="#fff" />);
  return L.divIcon({
    className: '',
    html: `<div class="lw-pin" style="background:${CATEGORY_COLORS[category] || '#64748b'}">${svg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function ReportMap({ reports, onOpen, center, circleRadiusKm }) {
  const withCoords = reports.filter((r) => r.latitude != null && r.longitude != null);
  const mapCenter = center || (withCoords.length ? [withCoords[0].latitude, withCoords[0].longitude] : [-6.2, 106.816666]);

  return (
    <div className="relative z-0 h-[480px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <MapContainer center={mapCenter} zoom={center ? 14 : 12} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={mapCenter} zoom={center ? 14 : 12} />
        {center && circleRadiusKm && (
          <Circle
            center={center}
            radius={circleRadiusKm * 1000}
            pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 0.08 }}
          />
        )}
        <MarkerClusterGroup chunkedLoading>
          {withCoords.map((r) => (
            <Marker key={r.id} position={[r.latitude, r.longitude]} icon={makeIcon(r.category)}>
              <Popup>
                <div className="min-w-[200px]">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{r.category}</p>
                  <p className="text-sm font-bold leading-snug text-slate-900">{r.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {STATUS_LABEL[r.status]} · 👍 {r.upvotes}
                    {r.distance_km != null ? ` · ${r.distance_km.toFixed(1)} km` : ''}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={() => onOpen(r.id)}
                      className="text-sm font-bold text-emerald-600 hover:underline"
                    >
                      Lihat detail →
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline"
                    >
                      <Navigation className="h-3.5 w-3.5" /> Arah
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
