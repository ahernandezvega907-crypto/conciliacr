import pandas as pd
import pdfplumber
import io
import re
from datetime import date, datetime
from dateutil import parser as date_parser
from typing import List, Dict, Optional


SPANISH_MONTHS = {
    "ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AGO": 8, "SEP": 9, "SET": 9, "OCT": 10, "NOV": 11, "DIC": 12,
}

MONEY_RE = re.compile(r"^-?[\d.,]+\.\d{2}$")
SPANISH_DATE_RE = re.compile(r"^[A-Za-z]{3}/\d{1,2}$")


def parse_amount(raw: str) -> float:
    """Convierte '₡1,500.00', '1.500,00', '-500' etc a float."""
    if isinstance(raw, (int, float)):
        return float(raw)
    cleaned = re.sub(r"[₡$\s]", "", str(raw))
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


# ---------------------------------------------------------------------------
# Extracción de PDFs bancarios sin líneas de tabla (ej. BAC Costa Rica),
# donde los movimientos se distinguen por posición (X/Y) del texto en vez
# de bordes dibujados, y débitos/créditos están en columnas separadas con
# fechas abreviadas en español sin año ("AGO/01").
# ---------------------------------------------------------------------------

def _extract_statement_year_and_cutoff(full_text: str):
    """Busca 'Fecha de Corte: DD/MES/AA' para inferir el año de las transacciones."""
    match = re.search(r"(\d{2})/([A-Za-z]{3})/(\d{2,4})", full_text)
    if not match:
        return None, None
    _, month_str, year_str = match.groups()
    month = SPANISH_MONTHS.get(month_str.upper())
    year = int(year_str)
    if year < 100:
        year += 2000
    return year, month


def _parse_spanish_short_date(text: str, reference_year: Optional[int], cutoff_month: Optional[int]):
    if not SPANISH_DATE_RE.match(text.strip()):
        return None
    month_str, day_str = text.strip().split("/")
    month = SPANISH_MONTHS.get(month_str.upper())
    if not month or not reference_year:
        return None
    year = reference_year
    # Si el mes de la transacción es posterior al mes de corte, pertenece al año anterior
    # (ej. corte en enero, movimiento de diciembre)
    if cutoff_month and month > cutoff_month:
        year -= 1
    try:
        return date(year, month, int(day_str))
    except ValueError:
        return None


def _group_words_into_rows(words, y_tolerance: float = 3):
    rows = []
    current_row = []
    current_top = None
    for w in sorted(words, key=lambda x: (x["top"], x["x0"])):
        if current_top is None or abs(w["top"] - current_top) <= y_tolerance:
            current_row.append(w)
            current_top = w["top"] if current_top is None else current_top
        else:
            rows.append(current_row)
            current_row = [w]
            current_top = w["top"]
    if current_row:
        rows.append(current_row)
    return rows


def _find_debit_credit_columns(words) -> Dict[str, float]:
    """Ubica la posición X de los encabezados DÉBITOS / CRÉDITOS en la página."""
    cols = {}
    for w in words:
        text = w["text"].upper().replace("É", "E")
        if "DEBITOS" in text:
            cols["debitos"] = w["x0"]
        elif "CREDITOS" in text:
            cols["creditos"] = w["x0"]
    return cols


def _parse_bank_pdf_by_position(file_bytes: bytes, source: str) -> List[Dict]:
    """
    Extrae movimientos de un PDF bancario reconstruyendo filas por posición
    de palabras, para bancos que no dibujan bordes de tabla (ej. BAC Costa Rica)
    y separan débitos/créditos en columnas distintas con fechas sin año.
    """
    records: List[Dict] = []
    full_text_parts = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            full_text_parts.append(page.extract_text() or "")

    full_text = "\n".join(full_text_parts)
    reference_year, cutoff_month = _extract_statement_year_and_cutoff(full_text)

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            debit_credit_cols = _find_debit_credit_columns(words)

            if "debitos" not in debit_credit_cols or "creditos" not in debit_credit_cols:
                continue  # página sin tabla de movimientos (ej. resumen de productos)

            midpoint = (debit_credit_cols["debitos"] + debit_credit_cols["creditos"]) / 2
            rows = _group_words_into_rows(words)

            for row_idx, row in enumerate(rows):
                row_sorted = sorted(row, key=lambda w: w["x0"])
                tokens = [w["text"] for w in row_sorted]

                date_idx = next((i for i, t in enumerate(tokens) if SPANISH_DATE_RE.match(t)), None)
                if date_idx is None:
                    continue

                fecha = _parse_spanish_short_date(tokens[date_idx], reference_year, cutoff_month)
                if fecha is None:
                    continue

                money_tokens = [
                    (i, w) for i, w in enumerate(row_sorted)
                    if i > date_idx and MONEY_RE.match(w["text"])
                ]
                if not money_tokens:
                    continue

                last_idx, last_word = money_tokens[-1]
                monto_valor = parse_amount(last_word["text"])

                is_credito = last_word["x0"] > midpoint
                monto = monto_valor if is_credito else -monto_valor

                concepto = " ".join(tokens[date_idx + 1: last_idx]).strip()

                records.append({
                    "row_id": f"{source}_{page.page_number}_{row_idx}",
                    "fecha": fecha.isoformat(),
                    "monto": monto,
                    "descripcion": concepto,
                    "source": source,
                })

    return records


def _parse_generic_pdf_table(file_bytes: bytes, source: str) -> List[Dict]:
    """Método original: para PDFs que sí tienen líneas de tabla dibujadas
    y una única columna de monto (positivo/negativo)."""
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


def parse_pdf(file_bytes: bytes, source: str) -> List[Dict]:
    """
    Intenta primero el método de extracción por posición (para bancos como BAC
    que no dibujan bordes de tabla y separan débitos/créditos). Si no encuentra
    movimientos, recurre al método genérico de tabla con líneas dibujadas.
    """
    records = _parse_bank_pdf_by_position(file_bytes, source)
    if records:
        return records

    return _parse_generic_pdf_table(file_bytes, source)


def parse_file(file_bytes: bytes, filename: str, source: str) -> List[Dict]:
    filename_lower = filename.lower()
    if filename_lower.endswith(".pdf"):
        return parse_pdf(file_bytes, source)
    elif filename_lower.endswith((".csv", ".xlsx", ".xls")):
        return parse_csv_or_excel(file_bytes, filename, source)
    else:
        raise ValueError(f"Formato no soportado: {filename}. Usa CSV, Excel o PDF.")