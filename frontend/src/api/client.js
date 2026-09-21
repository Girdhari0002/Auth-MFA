export const API_BASE = window.__SECUREID_CONFIG__?.apiBaseUrl
  || (window.location.port && window.location.port !== "3000" ? "http://localhost:3000" : "");

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
