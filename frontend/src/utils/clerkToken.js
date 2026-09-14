// A tiny bridge between Clerk's React hooks (which are only usable inside
// components) and axiosInstance (a plain module, not a component). See
// ClerkTokenBridge.jsx, which calls setTokenGetter() once Clerk has
// actually finished loading - this avoids the previous approach of reading
// window.Clerk.session.getToken() directly from the axios interceptor,
// which raced Clerk's own initialization on first page load and caused
// authenticated requests to silently 401 right after signing in.
let tokenGetter = null;

export function setTokenGetter(fn) {
  tokenGetter = fn;
}

export async function getAuthToken() {
  if (!tokenGetter) return null;
  try {
    return await tokenGetter();
  } catch {
    return null;
  }
}
