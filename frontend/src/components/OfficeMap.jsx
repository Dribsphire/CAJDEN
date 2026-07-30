import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import './OfficeMap.css';

// Custom marker icon (default Leaflet icon paths break under bundlers)
const officeIcon = new L.DivIcon({
  className: 'office-marker',
  html: `<div class="office-marker-pin"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -24],
});

// Centered roughly over Negros Island (Occidental + Oriental)
const NEGROS_CENTER = [10.1, 123.05];

export default function OfficeMap({ offices = [], height = 460 }) {
  if (!offices.length) {
    return (
      <div className="office-map-empty" style={{ height }}>
        No office locations available yet.
      </div>
    );
  }

  return (
    <div className="office-map-wrap" style={{ height }}>
      <MapContainer center={NEGROS_CENTER} zoom={8} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {offices.map(office => (
          <Marker
            key={office.id}
            position={[parseFloat(office.latitude), parseFloat(office.longitude)]}
            icon={officeIcon}
          >
            <Popup>
              <div className="office-popup">
                <strong>{office.office_name}</strong>
                <p><FaMapMarkerAlt /> {office.address}</p>
                {office.contact_number && <p><FaPhone /> {office.contact_number}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
