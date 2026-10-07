const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'laporwarga_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan pada server');
  return data;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  return parseResponse(res);
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),

  getStats: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'Semua')
    ).toString();
    return request(`/stats${qs ? `?${qs}` : ''}`);
  },

  getReports: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'Semua')
    ).toString();
    return request(`/reports${qs ? `?${qs}` : ''}`);
  },

  getReport: (id) => request(`/reports/${id}`),

  getDuplicates: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/reports/duplicates${qs ? `?${qs}` : ''}`);
  },

  createReport: (payload, photos = []) => {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') fd.append(k, v);
    });
    photos.forEach((f) => fd.append('photos', f));
    const token = getToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${BASE}/reports`, { method: 'POST', body: fd, headers }).then(parseResponse);
  },

  upvote: (id) => request(`/reports/${id}/upvote`, { method: 'POST' }),

  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),

  restoreReport: (id) => request(`/reports/${id}/restore`, { method: 'PATCH' }),

  exportReports: async (params = {}) => {
    const token = getToken();
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const res = await fetch(`${BASE}/reports/export${qs ? `?${qs}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal mengunduh CSV');
    }
    return res.text();
  },

  updateStatus: (id, status, note = '') =>
    request(`/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note })
    }),

  getComments: (id) => request(`/reports/${id}/comments`),

  addComment: (id, payload) =>
    request(`/reports/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }),

  getHistory: (id) => request(`/reports/${id}/history`),

  getPetugas: () => request('/users/petugas'),

  createPetugas: (payload) => request('/users/petugas', { method: 'POST', body: JSON.stringify(payload) }),

  updatePetugas: (id, payload) => request(`/users/petugas/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  resetPetugasPassword: (id, password) =>
    request(`/users/petugas/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }),

  deletePetugas: (id) => request(`/users/petugas/${id}`, { method: 'DELETE' }),

  getOfficerStats: () => request('/officers/stats'),

  getAuditLogs: (limit = 20) => request(`/audit-logs?limit=${limit}`),

  setResponse: (id, response) =>
    request(`/reports/${id}/response`, { method: 'PATCH', body: JSON.stringify({ response }) }),

  rateReport: (id, rating) =>
    request(`/reports/${id}/rating`, { method: 'POST', body: JSON.stringify({ rating }) }),

  assignReport: (id, userId) =>
    request(`/reports/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ user_id: userId }) })
};
