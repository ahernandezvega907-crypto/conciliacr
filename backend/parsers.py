import pandas as pd
import pdfplumber
import io
import re
from datetime import datetime
from dateutil import parser as date_parser
from typing import List, Dict


def parse_amount(raw: str) -> float:
    """Convierte '₡1,500.00', '1.500,00', '-500' etc a float."""
    if isinstance(raw, (int, float)):
        return float(raw)
    cleaned = re.sub(r"[₡$\s]", "", str(raw))
    # Detecta formato latino (1.500,00) vs internacional (1,500.00)
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_date_safe(raw: str):
    try:
        return date_parser.parse(str(raw), dayfirst=True).date()
    except Exception:
        return None


def normalize_dataframe(df: pd.DataFrame, source: str) -> List[Dict]:
    """
    Espera columnas flexibles: busca automáticamente cuáles corresponden
    a fecha, monto y descripción según nombres comunes.
    """
    cols_lower = {c.lower().strip(): c for c in df.columns}

    date_col = next((cols_lower[k] for k in cols_lower if "fecha" in k or "date" in k), None)
    amount_col = next((cols_lower[k] for k in cols_lower if "monto" in k or "amount" in k or "valor" in k), None)
    desc_col = next((cols_lower[k] for k in cols_lower if "desc" in k or "concepto" in k or "detalle" in k), None)

    if not date_col or not amount_col:
        raise ValueError(f"No se encontraron columnas de fecha/monto en {source}. Columnas detectadas: {list(df.columns)}")

    records = []
    for idx, row in df.iterrows():
        fecha = parse_date_safe(row[date_col])
        monto = parse_amount(row[amount_col])
        if fecha is None:
            continue
        records.append({
            "row_id": f"{source}_{idx}",
            "fecha": fecha.isoformat(),
            "monto": monto,
            "descripcion": str(row[desc_col]) if desc_col else "",
            "source": source,
        })
    return records


def parse_csv_or_excel(file_bytes: bytes, filename: str, source: str) -> List[Dict]:
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))
    return normalize_dataframe(df, source)


def parse_pdf(file_bytes: bytes, source: str) -> List[Dict]:
    rows = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table:
                continue
            header, *body = table
            df = pd.DataFrame(body, columns=header)
            rows.append(df)
    if not rows:
        raise ValueError(f"No se pudieron extraer tablas del PDF ({source}).")
    full_df = pd.concat(rows, ignore_index=True)
    return normalize_dataframe(full_df, source)


def parse_file(file_bytes: bytes, filename: str, source: str) -> List[Dict]:
    filename_lower = filename.lower()
    if filename_lower.endswith(".pdf"):
        return parse_pdf(file_bytes, source)
    elif filename_lower.endswith((".csv", ".xlsx", ".xls")):
        return parse_csv_or_excel(file_bytes, filename, source)
    else:
        raise ValueError(f"Formato no soportado: {filename}. Usa CSV, Excel o PDF.")