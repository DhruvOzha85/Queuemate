import { Platform } from 'react-native';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || 'https://queuemate-y6kg.onrender.com';

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Server may be waking up.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
