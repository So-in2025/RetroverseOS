import { useState, useEffect } from 'react';
import { economy } from '../services/economy';

export function useEconomy() {
  const [balance, setBalance] = useState(economy.getBalance());

  useEffect(() => {
    const unsubscribe = economy.subscribe(setBalance);
    return () => { unsubscribe(); };
  }, []);

  return { balance };
}
