from datetime import date, timedelta
from typing import List, Dict, Tuple

AMOUNT_TOLERANCE = 0.01
DATE_TOLERANCE_DAYS = 3


def reconcile(bank_records: List[Dict], ledger_records: List[Dict]) -> Dict:
    matched = []
    unmatched_bank = list(bank_records)
    unmatched_ledger = list(ledger_records)

    for bank_row in list(unmatched_bank):
        bank_date = date.fromisoformat(bank_row["fecha"])
        candidate = None

        for ledger_row in unmatched_ledger:
            ledger_date = date.fromisoformat(ledger_row["fecha"])
            amount_diff = abs(bank_row["monto"] - ledger_row["monto"])
            date_diff = abs((bank_date - ledger_date).days)

            if amount_diff <= AMOUNT_TOLERANCE and date_diff <= DATE_TOLERANCE_DAYS:
                candidate = ledger_row
                break

        if candidate:
            matched.append({
                "bank": bank_row,
                "ledger": candidate,
                "amount_diff": round(abs(bank_row["monto"] - candidate["monto"]), 2),
            })
            unmatched_bank.remove(bank_row)
            unmatched_ledger.remove(candidate)

    total_amount_matched = sum(m["bank"]["monto"] for m in matched)
    total_discrepancy = sum(r["monto"] for r in unmatched_bank) - sum(r["monto"] for r in unmatched_ledger)

    return {
        "matched": matched,
        "unmatched_bank": unmatched_bank,
        "unmatched_ledger": unmatched_ledger,
        "summary": {
            "total_bank_records": len(bank_records),
            "total_ledger_records": len(ledger_records),
            "matched_count": len(matched),
            "unmatched_bank_count": len(unmatched_bank),
            "unmatched_ledger_count": len(unmatched_ledger),
            "total_amount_matched": round(total_amount_matched, 2),
            "total_amount_discrepancy": round(total_discrepancy, 2),
        }
    }