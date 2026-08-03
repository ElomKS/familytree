const USE_MOCK = false;
const API_BASE =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost" ? "http://localhost:3001/api" : "/api");
const USERS_URL = `${API_BASE}/users`;
const AUTH_URL = `${API_BASE}/auth`;

let authToken = localStorage.getItem("token") || null;
let authUser = JSON.parse(localStorage.getItem("user") || "null");

export function getAuthToken() { return authToken; }
export function getAuthUser() { return authUser; }

export function setAuth(token, user) {
  authToken = token;
  authUser = user;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
  authToken = null;
  authUser = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function login(username, password) {
  const res = await fetch(`${AUTH_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Échec de la connexion.");
  setAuth(data.token, { username: data.username, role: data.role });
  return data;
}

async function apiCall(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${USERS_URL}${path}`, { headers, ...options });
  if (res.status === 401) { clearAuth(); window.location.reload(); throw new Error("Session expirée."); }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function authApiCall(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${AUTH_URL}${path}`, { headers, ...options });
  if (res.status === 401) { clearAuth(); window.location.reload(); throw new Error("Session expirée."); }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function fetchAuthUsers() {
  return authApiCall("/users");
}

export async function createAuthUser(username, password, role) {
  return authApiCall("/users", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export async function deleteAuthUser(id) {
  return authApiCall(`/users/${id}`, { method: "DELETE" });
}

export async function changePassword(currentPassword, newPassword) {
  return authApiCall("/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function resetUserPassword(userId, newPassword) {
  return authApiCall(`/users/${userId}/password`, {
    method: "PUT",
    body: JSON.stringify({ newPassword }),
  });
}

export function nextRecordNo(users) {
  const max = users.reduce((m, u) => Math.max(m, parseInt(u.recordNo, 10) || 0), 0);
  return String(max + 1).padStart(4, "0");
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export { apiCall, USE_MOCK };
