import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pickerIcon = L.divIcon({
  className: '',
  html: '<div class="lw-pin lw-pin-active"></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function MapPicker({ latitude, longitude, onChange }) {
  const center = latitude != null && longitude != null ? [latitude, longitude] : [-6.2, 106.816666];

  return (
    <div className="relative z-0 h-64 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        {latitude != null && longitude != null && (
          <Marker position={[latitude, longitude]} icon={pickerIcon} />
        )}
      </MapContainer>
    </div>
  );
}
