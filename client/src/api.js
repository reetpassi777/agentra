const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Request failed');
  return data;
}

export const api = {
  health:           ()            => request('/health'),
  getSubscribers:   (search = '') => request(`/subscribers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getStats:         ()            => request('/subscribers/stats'),
  addSubscriber:    (data)        => request('/subscribers', { method: 'POST', body: data }),
  removeSubscriber: (id)          => request(`/subscribers/${id}`, { method: 'DELETE' }),
  updateStatus:     (id, status)  => request(`/subscribers/${id}/status`, { method: 'PUT', body: { status } }),
  generateContent:  (data)        => request('/content/generate', { method: 'POST', body: data }),
  getHistory:       ()            => request('/content/history'),
  getLogs:          ()            => request('/content/logs'),
  verifySmtp:       ()            => request('/email/verify'),
  sendNewsletter:   (data)        => request('/email/send', { method: 'POST', body: data }),
  sendTest:         (data)        => request('/email/test', { method: 'POST', body: data }),
  saveDraft:        (id, data)    => request(`/content/${id}`, { method: 'PATCH', body: data }),
};
