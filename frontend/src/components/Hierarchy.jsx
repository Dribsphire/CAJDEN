import { FaUser } from 'react-icons/fa';
import { assetUrl } from '../api/axios';
import './Hierarchy.css';

// Fixed department buckets rendered on the chart, left to right.
// Officer records with rank_level = 3 must set `department` to one of these.
const DEPARTMENTS = ['Finance', 'Program', 'Community Development Worker', 'Volunteers'];

function PersonCard({ officer, size = 'md' }) {
  return (
    <div className={`org-person-card org-person-${size}`}>
      <div className="org-person-photo">
        {officer.photo_path ? (
          <img src={assetUrl(officer.photo_path)} alt={officer.full_name} />
        ) : (
          <FaUser aria-hidden="true" />
        )}
      </div>
      <div className="org-person-text">
        <strong>{officer.full_name}</strong>
        <span>{officer.position_title}</span>
      </div>
    </div>
  );
}

export default function Hierarchy({ officers = [], partners = [] }) {
  const boardMembers = officers.filter(o => Number(o.rank_level) === 1);
  const executiveDirector = officers.find(o => Number(o.rank_level) === 2);
  const departmentStaff = officers.filter(o => Number(o.rank_level) === 3);

  if (!officers.length) {
    return <p>Officer information is not available yet.</p>;
  }

  return (
    <div className="org-chart">
      {/* BOARD OF TRUSTEES + branching board members */}
      <div className="org-trustees-row">
        <div className="org-box org-box-trustees">BOARD OF TRUSTEES</div>
        {boardMembers.length > 0 && (
          <>
            <span className="org-stem" aria-hidden="true" />
            <div className="org-branch-right">
              {boardMembers.map(m => <PersonCard officer={m} size="sm" key={m.id} />)}
            </div>
          </>
        )}
      </div>

      {/* Connector down to Executive Director */}
      {executiveDirector && (
        <>
          <span className="org-connector" aria-hidden="true" />
          <div className="org-ed-wrap">
            <PersonCard officer={executiveDirector} size="lg" />
          </div>
        </>
      )}

      {/* Connector + bus line down to departments */}
      <span className="org-connector" aria-hidden="true" />
      <div className="org-departments-row">
        {DEPARTMENTS.map(dept => {
          const staff = departmentStaff.filter(o => o.department === dept);
          return (
            <div className="org-department" key={dept}>
              <div className="org-box org-box-dept">{dept}</div>
              {staff.length > 0 && (
                <>
                  <span className="org-stem" aria-hidden="true" />
                  <div className="org-branch-right org-branch-right-dept">
                    {staff.map(s => <PersonCard officer={s} size="sm" key={s.id} />)}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Partner / community organizations */}
      {partners.length > 0 && (
        <>
          <span className="org-connector" aria-hidden="true" />
          <div className="org-partners">
            <span className="org-partners-label">Partner Community Organizations</span>
            <div className="org-partners-row">
              {partners.map(p => (
                <span className="org-partner-chip" key={p.id}>{p.org_name}</span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
