// Keeps an estimate of (server clock - browser clock) from the X-Server-Time
// header the backend sends on every response. Countdowns use serverNow()
// so a wrong device clock doesn't show a wrong countdown. Display only -
// the backend alone decides whether voting is open.
let offsetMs = 0;

export function recordServerTime(headerValue) {
  const serverMs = Date.parse(headerValue);
  if (Number.isNaN(serverMs)) return;
  offsetMs = serverMs - Date.now();
}

export const serverNow = () => Date.now() + offsetMs;
