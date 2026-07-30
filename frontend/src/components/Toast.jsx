import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import './Toast.css';

export default function Toast({ type = 'success', message, onClose }) {
  if (!message) return null;
  return (
    <div className={`toast toast-${type}`} role="alert">
      {type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss">&times;</button>
    </div>
  );
}
