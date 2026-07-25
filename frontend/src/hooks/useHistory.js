import { useState, useEffect, useCallback } from 'react';

const HISTORY_KEY = 'qr_generator_history';

export function useHistory() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((item) => {
    setItems(prev => {
      const next = [{ ...item, time: Date.now() }, ...prev];
      return next.slice(0, 50);
    });
  }, []);

  const remove = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, add, remove, clear };
}
