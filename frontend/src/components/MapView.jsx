import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
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

// Helper component to update map view dynamically
const MapCenterUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

// Map click handler to open Google Maps directions for a clicked custom point
const MapClickHandler = () => {
  const [clickedPos, setClickedPos] = useState(null);
  
  useMapEvents({
    click(e) {
      setClickedPos(e.latlng);
    }
  });

  if (!clickedPos) return null;

  return (
    <Popup position={clickedPos} onClose={() => setClickedPos(null)}>
      <div className="p-2 text-center font-sans">
        <p className="font-bold text-slate-900 text-xs mb-1">Custom Location Pin</p>
        <p className="text-[10px] text-slate-500 mb-2 font-mono">{clickedPos.lat.toFixed(5)}, {clickedPos.lng.toFixed(5)}</p>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${clickedPos.lat},${clickedPos.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-1 px-3 rounded text-[10px] block transition-colors shadow-sm"
        >
          Get Directions ↗
        </a>
      </div>
    </Popup>
  );
};

const MapView = ({ center = [12.9716, 77.5946], markers = [], zoom = 12 }) => {
  // Ensure center has valid coordinates
  const validCenter = center && center[0] && center[1] ? center : [12.9716, 77.5946];

  return (
    <div className="w-full h-full min-h-[300px] relative rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shadow-inner">
      <MapContainer
        center={validCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
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
        <MapCenterUpdater center={validCenter} zoom={zoom} />
        <MapClickHandler />
        
        {markers.map((marker, index) => {
          if (!marker.position || !marker.position[0] || !marker.position[1]) return null;
          
          return (
            <Marker 
              key={index} 
              position={marker.position}
              eventHandlers={{
                dblclick: () => {
                  // Double click on marker immediately opens Google Maps directions
                  const [lat, lng] = marker.position;
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                }
              }}
            >
              {marker.popup && (
                <Popup>
                  <div className="text-slate-900 font-sans p-1 text-xs">
                    {marker.popup}
                    {/* Directions link added inside the marker popup for easy click navigation */}
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${marker.position[0]},${marker.position[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-1 px-2.5 rounded text-[10px] flex items-center justify-center gap-1 transition-colors"
                      >
                        Navigate in Google Maps ↗
                      </a>
                    </div>
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
