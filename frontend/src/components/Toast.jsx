import { useEffect, useRef } from 'react';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import './Toast.css';

// Messages close themselves so they never sit on top of buttons; errors stay
// up a little longer so there's time to read them.
const AUTO_CLOSE_MS = { success: 3500, error: 7000 };

export default function Toast({ type = 'success', message, onClose }) {
  // Pages pass a new inline onClose each render; keep the latest in a ref so
  // re-renders don't restart the countdown.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => closeRef.current?.(), AUTO_CLOSE_MS[type] ?? 4000);
    return () => clearTimeout(timer);
  }, [message, type]);

  if (!message) return null;
  return (
    <div className={`toast toast-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss">&times;</button>
    </div>
  );
}
