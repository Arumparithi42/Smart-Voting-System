import { useEffect, useState } from 'react';
import axiosInstance from './axiosInstance';

// Absolute URL for a backend-served public file (e.g. profile photos).
export const mediaUrl = (path) => (path ? `${import.meta.env.VITE_BACKEND_URL || ''}${path}` : null);

// Private files (complaint attachments) need the auth header, so they are
// fetched as a blob and shown through a temporary object URL.
export function useAuthedFileUrl(path) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!path) return undefined;
    let objectUrl = null;
    let cancelled = false;
    axiosInstance.get(path, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  return url;
}

export async function openAuthedFile(path) {
  const res = await axiosInstance.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
