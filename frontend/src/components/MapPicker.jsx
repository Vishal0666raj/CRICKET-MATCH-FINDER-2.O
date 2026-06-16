import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React bundles
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

// Green marker icon for nearby selectable grounds
const greenGroundIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to update map center and handle clicks
const MapEventsHandler = ({ position, onChange }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  return null;
};

const MapPicker = ({ value, onChange, defaultCenter = { lat: 12.9716, lng: 77.5946 }, nearbyGrounds = [], onSelectGround }) => {
  const position = value || defaultCenter;

  return (
    <div className="w-full h-80 relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Hybrid Satellite Map: base imagery + reference boundaries/names + road lines */}
        <TileLayer
          attribution='Tiles &copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
        />

        <MapEventsHandler position={value} onChange={onChange} />
        
        {/* Current Pinpoint Marker */}
        {value && (
          <Marker position={[value.lat, value.lng]}>
            <Popup>
              <div className="p-1 font-sans text-xs text-center">
                <span className="font-bold text-slate-800">Match Location Pin</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Nearby Selectable Grounds */}
        {nearbyGrounds.map((ground, idx) => (
          <Marker
            key={idx}
            position={[ground.lat, ground.lng]}
            icon={greenGroundIcon}
          >
            <Popup>
              <div className="p-2 font-sans text-center text-xs">
                <p className="font-bold text-slate-900 text-sm mb-0.5">{ground.name}</p>
                <p className="text-[10px] text-slate-500 mb-2">{ground.address}</p>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ lat: ground.lat, lng: ground.lng });
                    if (onSelectGround) {
                      onSelectGround(ground);
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-1 px-3 rounded text-[10px] block w-full transition-colors cursor-pointer"
                >
                  Select this Ground
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Coordinate Display Overlay */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-slate-900/90 px-3 py-1.5 rounded-lg text-[10px] text-slate-300 border border-slate-800 font-mono">
        Pin Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
      </div>
    </div>
  );
};

export default MapPicker;
