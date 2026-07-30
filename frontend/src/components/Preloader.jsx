import { useEffect, useState } from 'react';
import logo from '../assets/logo/cajdencolored.png';
import './Preloader.css';

/**
 * Full-screen branded loading screen shown briefly on first app load.
 * Stays visible for at least `minDuration` ms so the logo doesn't just
 * flash, then fades out and calls onFinish() so the parent can unmount it.
 */
export default function Preloader({ minDuration = 1100, onFinish }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), minDuration);
    const removeTimer = setTimeout(() => onFinish?.(), minDuration + 450);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [minDuration, onFinish]);

  return (
    <div className={`preloader ${fading ? 'preloader-fade' : ''}`} role="status" aria-label="Loading site">
      <div className="preloader-ring">
        <img src={logo} alt="" className="preloader-logo" />
      </div>
      <span className="preloader-text">CAJDEN</span>
    </div>
  );
}
