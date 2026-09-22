import { create } from 'zustand';
import { ReconciliationResult, PickedFile } from '../types/reconciliation.types';
import { reconcileFiles } from '../api/reconciliationApi';

interface ReconciliationState {
  bankFile: PickedFile | null;
  ledgerFile: PickedFile | null;
  result: ReconciliationResult | null;
  isLoading: boolean;
  error: string | null;
  setBankFile: (file: PickedFile) => void;
  setLedgerFile: (file: PickedFile) => void;
  runReconciliation: () => Promise<void>;
  reset: () => void;
}

export const useReconciliationStore = create<ReconciliationState>((set, get) => ({
  bankFile: null,
  ledgerFile: null,
  result: null,
  isLoading: false,
  error: null,

  setBankFile: (file) => set({ bankFile: file, error: null }),
  setLedgerFile: (file) => set({ ledgerFile: file, error: null }),

  runReconciliation: async () => {
    const { bankFile, ledgerFile } = get();

    if (!bankFile || !ledgerFile) {
      set({ error: 'Debes seleccionar ambos archivos.' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const result = await reconcileFiles(bankFile, ledgerFile);
      set({ result, isLoading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ??
        err?.message ??
        'Error desconocido al conciliar los archivos.';
      set({ error: message, isLoading: false });
    }
  },

  reset: () =>
    set({ bankFile: null, ledgerFile: null, result: null, error: null, isLoading: false }),
}));