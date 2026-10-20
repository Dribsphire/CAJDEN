import { assetUrl } from '../api/axios';
import { decodeHtml } from '../utils/format.js';
import { DEPARTMENTS } from '../constants/officers.js';
import { splitName, initials } from '../utils/people.js';
import './Hierarchy.css';

const AVATAR_TINTS = ['tint-sun', 'tint-sky', 'tint-orange', 'tint-field'];
// FBPOs without a photo get their acronym on a coloured tile instead.
const PARTNER_TINTS = ['tint-field', 'tint-sun', 'tint-sky', 'tint-orange', 'tint-ink'];

function Avatar({ officer, name, index }) {
  if (officer.photo_path) {
    return <img className="org-avatar" src={assetUrl(officer.photo_path)} alt="" loading="lazy" />;
  }
  return (
    <span className={`org-avatar org-avatar-initials ${AVATAR_TINTS[index % AVATAR_TINTS.length]}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function PersonCard({ officer, index = 0, highlight = false }) {
  const { name, credentials } = splitName(officer.full_name);
  return (
    <li className={`org-person ${highlight ? 'org-person-highlight' : ''}`}>
      <Avatar officer={officer} name={name} index={index} />
      <div className="org-person-text">
        <strong>{name}</strong>
        {credentials && <span className="org-person-cred">{credentials}</span>}
        <span className="org-person-role">{decodeHtml(officer.position_title)}</span>
      </div>
    </li>
  );
}

function Connector() {
  return <span className="org-connector" aria-hidden="true" />;
}

export default function Hierarchy({ officers = [], partners = [] }) {
  const board = officers.filter(o => Number(o.rank_level) === 1);
  const director = officers.find(o => Number(o.rank_level) === 2);
  const staff = officers.filter(o => Number(o.rank_level) === 3);

  // Known departments first in their fixed order, then any others found in the data,
  // so a staff member with an unexpected department still shows up.
  const extra = [...new Set(staff.map(s => s.department || 'Staff'))].filter(d => !DEPARTMENTS.includes(d));
  const departments = [...DEPARTMENTS, ...extra]
    .map(name => ({ name, people: staff.filter(s => (s.department || 'Staff') === name) }))
    .filter(d => d.people.length > 0);

  if (!officers.length) {
    return <p className="empty-note">Officer information is not available yet.</p>;
  }

  return (
    <div className="org-chart">
      {board.length > 0 && (
        <section className="org-tier org-board" aria-labelledby="org-board-title">
          <h3 id="org-board-title" className="org-tier-label poster">
            Board of{' '}<br />Trustees
            <span className="mono">{board.length} members</span>
          </h3>
          <ul className="org-board-grid">
            {board.map((o, i) => <PersonCard officer={o} index={i} highlight={i === 0} key={o.id} />)}
          </ul>
        </section>
      )}

      {director && (
        <>
          {board.length > 0 && <Connector />}
          <section className="org-tier org-director" aria-label="Executive Director">
            {director.photo_path
              ? <img className="org-director-photo" src={assetUrl(director.photo_path)} alt="" />
              : <span className="org-director-photo org-avatar-initials tint-sun" aria-hidden="true">{initials(splitName(director.full_name).name)}</span>}
            <div className="org-director-text">
              <span className="label">{decodeHtml(director.position_title)}</span>
              <strong className="serif">{splitName(director.full_name).name}</strong>
              {splitName(director.full_name).credentials && (
                <span className="mono">{splitName(director.full_name).credentials}</span>
              )}
            </div>
          </section>
        </>
      )}

      {departments.length > 0 && (
        <>
          <Connector />
          <section
            className="org-tier org-departments"
            style={{ '--cols': Math.min(departments.length, 4) }}
            aria-label="Departments"
          >
            {departments.map(d => (
              <div className="org-dept" key={d.name}>
                <h3 className="org-dept-head">
                  <span className="poster">{d.name}</span>
                  <span className="mono">{d.people.length}</span>
                </h3>
                <ul className="org-dept-list">
                  {d.people.map((o, i) => <PersonCard officer={o} index={i + 1} key={o.id} />)}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}

      {partners.length > 0 && (
        <>
          <section className="org-tier org-partners" aria-labelledby="org-partners-title">
            <h3 id="org-partners-title" className="org-tier-label poster">
              Partner{' '}<br />FBPOs
              <span className="mono">{partners.length} organizations</span>
            </h3>
            <ul className="org-partner-grid">
              {partners.map((p, i) => (
                <li key={p.id} className="org-partner">
                  {p.photo_path ? (
                    <>
                      <img src={assetUrl(p.photo_path)} alt={`${decodeHtml(p.org_name)} members`} loading="lazy" />
                      <strong className="poster">{decodeHtml(p.org_name)}</strong>
                    </>
                  ) : (
                    // No photo: the acronym itself fills the tile, sized to its length so it never breaks mid-word.
                    <strong
                      className={`poster org-partner-mark ${PARTNER_TINTS[i % PARTNER_TINTS.length]}`}
                      style={{ '--len': Math.max(4, decodeHtml(p.org_name).length) }}
                    >
                      {decodeHtml(p.org_name)}
                    </strong>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
