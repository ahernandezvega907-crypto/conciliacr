import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';

const DEVICE_ID_KEY = 'conciliacr_device_id';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = randomUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  cachedDeviceId = id;
  return id;
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  return deviceId;
}