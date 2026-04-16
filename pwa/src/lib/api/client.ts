import axios from 'axios';

// /backend is the Next.js rewrite proxy → API container (works on any device/IP).
// Override NEXT_PUBLIC_API_BASE_URL only when running the PWA outside Docker.
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/backend';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
});

import { useFamilyStore } from '@/store/familyStore';

apiClient.interceptors.request.use((config) => {
  // Access the store state directly from the exported hook's getState method
  const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;

  if (familyMemberId) {
    config.headers['X-Family-Member-Id'] = familyMemberId;
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
