const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
const configuredApiBase = window.__SECUREID_CONFIG__?.apiBaseUrl;

export const API_BASE = isLocalhost
  ? "http://localhost:3002"
  : configuredApiBase || "";

export async function api(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.message || "Something went wrong."), { data, status: response.status });
  }
  return data;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[char]));
}
