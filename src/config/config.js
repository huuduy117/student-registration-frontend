// API base URL — reads from Vite env, falls back to empty string (relative URLs via proxy in dev)
export const API_URL = import.meta.env.VITE_API_URL || "";

// WebSocket base URL — derive from API_URL, swapping http→ws protocol
export const WS_URL = API_URL
  ? API_URL.replace(/^http/, "ws")
  : `ws://${window.location.host}`;
