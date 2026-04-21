import axios from 'axios';
import { API_BASE_URL } from '@/lib/constants/config';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
    const data = error.response?.data;
    const message = data?.message ?? data?.title ?? error.message ?? 'Unknown error';

    if (status === 400 && data?.errors) {
      console.error('Validation errors:', data.errors);
    }

    return Promise.reject({ status, message, code: data?.code, data });
  }
);
