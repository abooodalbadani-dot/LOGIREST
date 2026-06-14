/* eslint-disable react-hooks/refs */
import { useEffect, useRef } from 'react';
 
export function useAbortController() {
  const ref = useRef<AbortController | null>(null);

  if (!ref.current || ref.current.signal.aborted) {
    ref.current = new AbortController();
  }

  useEffect(() => {
    return () => {
      ref.current?.abort();
    };
  }, []);

  return ref.current;
}
