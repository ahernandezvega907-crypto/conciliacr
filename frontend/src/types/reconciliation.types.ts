export interface ReconciliationRecord {
  row_id: string;
  fecha: string;
  monto: number;
  descripcion: string;
  source: 'bank' | 'ledger';
}

export interface MatchedPair {
  bank: ReconciliationRecord;
  ledger: ReconciliationRecord;
  amount_diff: number;
}

export interface ReconciliationSummary {
  total_bank_records: number;
  total_ledger_records: number;
  matched_count: number;
  unmatched_bank_count: number;
  unmatched_ledger_count: number;
  total_amount_matched: number;
  total_amount_discrepancy: number;
}

export interface ReconciliationResult {
  matched: MatchedPair[];
  unmatched_bank: ReconciliationRecord[];
  unmatched_ledger: ReconciliationRecord[];
  summary: ReconciliationSummary;
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

export interface HistoryEntry {
  id: number;
  client_name: string | null;
  filename_bank: string;
  filename_ledger: string;
  total_bank_records: number;
  total_ledger_records: number;
  matched_count: number;
  unmatched_bank_count: number;
  unmatched_ledger_count: number;
  total_amount_matched: number;
  total_amount_discrepancy: number;
  created_at: string | null;
}