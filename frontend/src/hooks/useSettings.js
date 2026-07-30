import { useEffect, useState } from 'react';
import api from '../api/axios';

export function useSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings.php')
      .then(res => setSettings(res.data.settings || {}))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}
