import axios from 'axios';
import { ReconciliationResult, PickedFile, HistoryEntry } from '../types/reconciliation.types';

const API_BASE_URL = 'https://conciliacr-api.onrender.com';

export const reconciliationApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export async function reconcileFiles(
  bankFile: PickedFile,
  ledgerFile: PickedFile
): Promise<ReconciliationResult> {
  const formData = new FormData();

  formData.append('bank_statement', {
    uri: bankFile.uri,
    name: bankFile.name,
    type: bankFile.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);

  formData.append('internal_ledger', {
    uri: ledgerFile.uri,
    name: ledgerFile.name,
    type: ledgerFile.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);

  const response = await reconciliationApi.post<ReconciliationResult>(
    '/reconcile',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  return response.data;
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const response = await reconciliationApi.get<HistoryEntry[]>('/history');
  return response.data;
}