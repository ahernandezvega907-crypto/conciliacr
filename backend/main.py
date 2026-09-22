import os
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from models import get_db, ReconciliationJob
from parsers import parse_file
from reconciliation import reconcile

app = FastAPI(title="ConciliaCR API")

# En producción, restringir a los dominios reales de tu app
# (por ahora "*" para no bloquearte mientras probás desde Expo Go)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/reconcile")
async def reconcile_endpoint(
    bank_statement: UploadFile = File(...),
    internal_ledger: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        bank_bytes = await bank_statement.read()
        ledger_bytes = await internal_ledger.read()

        bank_records = parse_file(bank_bytes, bank_statement.filename, source="bank")
        ledger_records = parse_file(ledger_bytes, internal_ledger.filename, source="ledger")

        result = reconcile(bank_records, ledger_records)

        job = ReconciliationJob(
            filename_bank=bank_statement.filename,
            filename_ledger=internal_ledger.filename,
            total_bank_records=result["summary"]["total_bank_records"],
            total_ledger_records=result["summary"]["total_ledger_records"],
            matched_count=result["summary"]["matched_count"],
            unmatched_bank_count=result["summary"]["unmatched_bank_count"],
            unmatched_ledger_count=result["summary"]["unmatched_ledger_count"],
            total_amount_matched=result["summary"]["total_amount_matched"],
            total_amount_discrepancy=result["summary"]["total_amount_discrepancy"],
        )
        db.add(job)
        db.commit()

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")