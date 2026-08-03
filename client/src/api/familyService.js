import { getAuthToken } from "./userService";

const API_BASE =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost" ? "http://localhost:3001/api" : "/api");

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  if (res.status === 401) {
    window.location.reload();
    throw new Error("Session expirée.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export function fetchPeople() {
  return api("/people");
}

export function createPerson(body) {
  return api("/people", { method: "POST", body: JSON.stringify(body) });
}

export function updatePerson(id, body) {
  return api(`/people/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function deletePerson(id) {
  return api(`/people/${id}`, { method: "DELETE" });
}

export function fetchRelationships() {
  return api("/relationships");
}

export function createRelationship(body) {
  return api("/relationships", { method: "POST", body: JSON.stringify(body) });
}

export function deleteRelationship(id) {
  return api(`/relationships/${id}`, { method: "DELETE" });
}
