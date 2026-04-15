import axios from 'axios';

// /backend is the Next.js rewrite proxy → API container (works on any device/IP).
// Override NEXT_PUBLIC_API_BASE_URL only when running the PWA outside Docker.
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/backend';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof document !== 'undefined') {
    const memberId = document.cookie
      .split('; ')
      .find((row) => row.startsWith('member_id='))
      ?.split('=')[1];

    if (memberId) {
      config.headers['X-Member-Id'] = memberId;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const message = error.response?.data?.message ?? error.message ?? 'Unknown error';
    return Promise.reject({ status, message, code: error.response?.data?.code });
  }
);
