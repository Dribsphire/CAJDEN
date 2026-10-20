import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { FaSearch, FaMapMarkerAlt, FaCrosshairs } from 'react-icons/fa';
import { officeIcon, NEGROS_CENTER } from './OfficeMap.jsx';
import './LocationPicker.css';

// OpenStreetMap's free geocoder. Its usage policy allows ~1 request/second,
// so we only call it on an explicit search or button press, never per keystroke.
const NOMINATIM = 'https://nominatim.openstreetmap.org';
// Bias results toward Negros Island (left, top, right, bottom).
const NEGROS_VIEWBOX = '122.3,11.1,123.6,9.0';
const PIN_ZOOM = 16;

const round = n => Math.round(n * 1e7) / 1e7; // matches DECIMAL(10,7) in the DB

function ClickToPlace({ onPick }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Pans the map whenever `target` changes (e.g. after a search).
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.center, target.zoom, { duration: 0.6 });
  }, [target, map]);
  return null;
}

/**
 * Map-based coordinate picker for the admin office form.
 * Props:
 *  - lat, lng: current values (numbers or numeric strings; empty = no pin yet)
 *  - onChange(lat, lng)
 *  - onAddressFound(address): called when the admin asks to fill the address from the pin
 *  - addressHint: the form's address text, used to pre-fill the search
 */
export default function LocationPicker({ lat, lng, onChange, onAddressFound, addressHint = '' }) {
  const hasPin = lat !== '' && lng !== '' && lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  const position = hasPin ? [Number(lat), Number(lng)] : null;

  // Center once on mount: the existing pin when editing, Negros otherwise.
  const initial = useRef({ center: position || NEGROS_CENTER, zoom: position ? PIN_ZOOM : 8 });
  const [flyTarget, setFlyTarget] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);

  const place = (la, ln) => onChange(round(la), round(ln));

  const markerHandlers = useMemo(() => ({
    dragend: e => { const p = e.target.getLatLng(); place(p.lat, p.lng); },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function search(e) {
    e?.preventDefault();
    const q = (query || addressHint).trim();
    if (!q) { setStatus('Type a place, community, or address to search.'); return; }
    if (!query) setQuery(q);
    setBusy(true); setStatus(''); setResults(null);
    try {
      const url = `${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=ph&viewbox=${NEGROS_VIEWBOX}&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (!data.length) setStatus('No match found. Try a nearby landmark or town, or click the map directly.');
      else if (data.length === 1) choose(data[0]);
      else setResults(data);
    } catch {
      setStatus('Search is unavailable right now. You can still click the map to place the pin.');
    } finally {
      setBusy(false);
    }
  }

  function choose(r) {
    const la = Number(r.lat), ln = Number(r.lon);
    place(la, ln);
    setFlyTarget({ center: [la, ln], zoom: PIN_ZOOM });
    setResults(null);
    setStatus('Pin placed. Drag it or click the map to fine-tune the exact spot.');
  }

  async function fillAddress() {
    if (!hasPin) return;
    setBusy(true); setStatus('');
    try {
      const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data.display_name) {
        // Drop the trailing ", Philippines" and postcode noise for a cleaner label.
        const parts = data.display_name.split(', ').filter(p => p !== 'Philippines' && !/^\d{4}$/.test(p));
        onAddressFound?.(parts.join(', '));
        setStatus('Address filled from the pin. Edit it if needed.');
      } else {
        setStatus('No address found for this spot.');
      }
    } catch {
      setStatus('Address lookup is unavailable right now.');
    } finally {
      setBusy(false);
    }
  }

  function centerOnPin() {
    if (position) setFlyTarget({ center: position, zoom: PIN_ZOOM });
  }

  return (
    <div className="loc-picker">
      <div className="loc-search">
        <label className="search-field">
          <FaSearch aria-hidden="true" />
          <span className="sr-only">Search for a place</span>
          <input
            type="search"
            value={query}
            placeholder={addressHint ? `Search "${addressHint.slice(0, 40)}"` : 'Search a community, landmark, or address…'}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search(e); }}
          />
        </label>
        <button type="button" className="btn btn-sm" onClick={search} disabled={busy}>{busy ? '…' : 'Find'}</button>
      </div>

      {results && (
        <ul className="loc-results" role="listbox" aria-label="Search results">
          {results.map(r => (
            <li key={r.place_id}>
              <button type="button" onClick={() => choose(r)}>
                <FaMapMarkerAlt aria-hidden="true" /> {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="loc-map">
        <MapContainer center={initial.current.center} zoom={initial.current.zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onPick={place} />
          <FlyTo target={flyTarget} />
          {position && <Marker position={position} icon={officeIcon} draggable eventHandlers={markerHandlers} />}
        </MapContainer>
        {!hasPin && <div className="loc-map-hint mono">Click the map to drop the pin</div>}
      </div>

      <div className="loc-footer">
        <span className="mono loc-coords">
          {hasPin ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : 'No location set yet'}
        </span>
        <div className="loc-actions">
          {hasPin && <button type="button" className="loc-link" onClick={centerOnPin}><FaCrosshairs aria-hidden="true" /> Center on pin</button>}
          {hasPin && onAddressFound && <button type="button" className="loc-link" onClick={fillAddress} disabled={busy}>Use pin to fill address</button>}
          <button type="button" className="loc-link" onClick={() => setManual(m => !m)}>{manual ? 'Hide' : 'Enter'} coordinates manually</button>
        </div>
      </div>

      {manual && (
        <div className="loc-manual">
          <label>
            <span className="mono">Latitude</span>
            <input type="number" step="any" min="-90" max="90" value={lat ?? ''} onChange={e => onChange(e.target.value, lng)} placeholder="10.6713" />
          </label>
          <label>
            <span className="mono">Longitude</span>
            <input type="number" step="any" min="-180" max="180" value={lng ?? ''} onChange={e => onChange(lat, e.target.value)} placeholder="122.9511" />
          </label>
        </div>
      )}

      {status && <p className="loc-status" role="status">{status}</p>}
    </div>
  );
}
