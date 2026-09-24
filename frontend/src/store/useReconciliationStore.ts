import { create } from 'zustand';
import { ReconciliationResult, PickedFile } from '../types/reconciliation.types';
import { reconcileFiles } from '../api/reconciliationApi';

interface ReconciliationState {
  bankFile: PickedFile | null;
  ledgerFile: PickedFile | null;
  clientName: string;
  result: ReconciliationResult | null;
  isLoading: boolean;
  error: string | null;
  setBankFile: (file: PickedFile) => void;
  setLedgerFile: (file: PickedFile) => void;
  setClientName: (name: string) => void;
  runReconciliation: () => Promise<void>;
  reset: () => void;
}

function buildErrorMessage(err: any): string {
  if (err?.code === 'ECONNABORTED') {
    return 'El servidor tardó demasiado en responder. Probá de nuevo en unos segundos.';
  }

  if (err?.message === 'Network Error') {
    return 'No se pudo conectar al servidor. Revisá tu conexión a internet e intentá de nuevo.';
  }

  const backendDetail = err?.response?.data?.detail;
  if (typeof backendDetail === 'string') {
    return backendDetail;
  }

  const status = err?.response?.status;
  if (status === 400) {
    return 'Uno de los archivos no tiene el formato esperado. Verificá que tenga columnas de fecha, monto y descripción.';
  }
  if (status && status >= 500) {
    return 'Ocurrió un error en el servidor al procesar los archivos. Intentá de nuevo en unos minutos.';
  }

  return 'Error desconocido al conciliar los archivos. Intentá de nuevo.';
}

export const useReconciliationStore = create<ReconciliationState>((set, get) => ({
  bankFile: null,
  ledgerFile: null,
  clientName: '',
  result: null,
  isLoading: false,
  error: null,

  setBankFile: (file) => set({ bankFile: file, error: null }),
  setLedgerFile: (file) => set({ ledgerFile: file, error: null }),
  setClientName: (name) => set({ clientName: name }),

  runReconciliation: async () => {
    const { bankFile, ledgerFile, clientName } = get();

    if (!bankFile || !ledgerFile) {
      set({ error: 'Debes seleccionar ambos archivos.' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const result = await reconcileFiles(bankFile, ledgerFile, clientName);
      set({ result, isLoading: false });
    } catch (err: any) {
      set({ error: buildErrorMessage(err), isLoading: false });
    }
  },

  reset: () =>
    set({
      bankFile: null,
      ledgerFile: null,
      clientName: '',
      result: null,
      error: null,
      isLoading: false,
    }),
}));