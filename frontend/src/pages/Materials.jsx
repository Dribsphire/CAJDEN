import { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import api from '../api/axios';
import PageHeader from '../components/PageHeader.jsx';
import { FeaturedMaterial, MaterialRow } from '../components/MaterialCards.jsx';
import { MATERIAL_TYPES } from '../constants/materials.js';
import './Materials.css';

export default function Materials() {
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    api.get('/materials.php', { params: { type: type || undefined, search: debounced || undefined } })
      .then(res => setItems(res.data.materials || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, debounced]);

  const browsing = !type && !debounced;
  const featured = browsing ? items.filter(m => Number(m.is_featured)).slice(0, 2) : [];

  return (
    <>
      <PageHeader
        title="Materials"
        size="lg"
        lede="Training modules, reports, and IEC materials, free for parishes, schools, and partner organizations to use."
        crumbs={[{ label: 'Resources' }, { label: 'Materials' }]}
      />

      <section className="section">
        <div className="container">
          {featured.length > 0 && (
            <div className={`materials-featured ${featured.length === 1 ? 'single' : ''}`}>
              {featured.map((m, i) => <FeaturedMaterial item={m} primary={i === 0} key={m.id} />)}
            </div>
          )}

          <div className="materials-controls">
            <div className="chips" role="group" aria-label="Filter by type">
              <button className={`chip ${!type ? 'active' : ''}`} onClick={() => setType('')}>All</button>
              {MATERIAL_TYPES.filter(t => t.value !== 'other').map(t => (
                <button key={t.value} className={`chip ${type === t.value ? 'active' : ''}`} onClick={() => setType(t.value)}>{t.plural}</button>
              ))}
            </div>
            <label className="search-field">
              <FaSearch aria-hidden="true" />
              <span className="sr-only">Search materials</span>
              <input type="search" placeholder="Search materials…" value={search} onChange={e => setSearch(e.target.value)} />
            </label>
          </div>

          {loading && <div className="skeleton" style={{ height: 320 }} />}

          {!loading && items.length === 0 && (
            <p className="empty-note">
              {browsing ? 'Downloadable modules and reports will be published here soon.' : 'Nothing matches that search yet.'}
            </p>
          )}

          {!loading && items.length > 0 && (
            <table className="materials-table">
              <thead className="mono">
                <tr><th>Type</th><th>Title</th><th>Language</th><th>Year</th><th>Size</th><th><span className="sr-only">Download</span></th></tr>
              </thead>
              <tbody>
                {items.map(m => <MaterialRow item={m} key={m.id} />)}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
