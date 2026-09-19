import { useEffect, useState } from 'react';

const getRemainingTime = (endTime) => {
  const endTimestamp = new Date(endTime).getTime();
  if (Number.isNaN(endTimestamp)) return null;
  return Math.max(0, endTimestamp - Date.now());
};

const formatRemainingTime = (remainingTime) => {
  const totalSeconds = Math.floor(remainingTime / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};

export default function ElectionCountdown({ endTime, className = '' }) {
  const [remainingTime, setRemainingTime] = useState(() => getRemainingTime(endTime));

  useEffect(() => {
    setRemainingTime(getRemainingTime(endTime));
    if (!endTime) return undefined;

    const timer = setInterval(() => {
      setRemainingTime(getRemainingTime(endTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (remainingTime === null) return null;

  return (
    <p className={className} role="timer" aria-live="polite">
      {remainingTime > 0
        ? `Time remaining: ${formatRemainingTime(remainingTime)}`
        : 'Voting time has ended'}
    </p>
  );
}
