"""ETL configurável do Line-Up Pecém -> Supabase.

O berço pode permanecer pendente: ele é preenchido manualmente ou por lineup
posterior. IMO e ETA continuam obrigatórios para evitar registros ambíguos.
"""

from __future__ import annotations

import argparse
import os
import re
import unicodedata
from datetime import datetime, timezone
from io import StringIO
from typing import Any, Iterable

import pandas as pd
import requests
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator
from rapidfuzz import fuzz, process

DEFAULT_LINEUP_URL = (
    "https://sic-tos.complexodopecem.com.br/"
    "sictossite/pesquisa.aspx?WCI=relEmitirLineUpExt_002"
)
ALLOWED_BERTHS = {"01", "02", "03", "04", "05", "06", "07", "08", "10"}
CONTAINER_PATTERN = re.compile(r"container|cont[eê]iner|porta[-\s]?cont[eê]iner", re.I)
GENERAL_CARGO_PATTERN = re.compile(
    r"placa|aco|siderurg|breakbulk|general cargo|carga projeto|projeto|"
    r"bobina|eolic|pa eolic|min[ée]rio|carv[aã]o|hulha|gran[eé]is? secos?|"
    r"maquina|equipamento|ferro|steel|cement|clinker",
    re.I,
)
LIQUID_BULK_PATTERN = re.compile(
    r"oil|gas|chemical|tanker|petroleiro|tanque|combust[ií]vel|nafta|"
    r"gasolina|diesel|metanol|am[oô]nia|[óo]leo",
    re.I,
)


def norm(value: Any) -> str:
    text = "" if value is None else str(value)
    return " ".join(
        unicodedata.normalize("NFD", text)
        .encode("ascii", "ignore")
        .decode("ascii")
        .upper()
        .split()
    )


def column(df: pd.DataFrame, names: Iterable[str]) -> str | None:
    normalized = {norm(name): name for name in df.columns}
    for candidate in names:
        if norm(candidate) in normalized:
            return normalized[norm(candidate)]
    for current, original in normalized.items():
        if any(norm(candidate) in current for candidate in names):
            return original
    return None


def parse_datetime(value: Any) -> datetime | None:
    if value is None or not str(value).strip():
        return None
    parsed = pd.to_datetime(str(value).strip(), dayfirst=True, errors="coerce")
    if pd.isna(parsed):
        return None
    result = parsed.to_pydatetime()
    return result.replace(tzinfo=result.tzinfo or timezone.utc)


def normalize_status(value: Any) -> str | None:
    status = norm(value)
    if "PROGRAMADO" in status or "PREVISTO" in status:
        return "PROGRAMADO"
    if "AO LARGO" in status or "FUNDEADO" in status:
        return "AO LARGO / FUNDEADO"
    if "OPERANDO" in status or "ATRACADO" in status:
        return "EM OPERACAO"
    if "DESATRACADO" in status or "CONCLUIDO" in status:
        return "CONCLUIDO"
    return None


def normalize_berth(value: Any) -> str | None:
    match = re.search(r"\b0?(10|[1-8])\b", str(value or ""))
    berth = match.group(1).zfill(2) if match else None
    return berth if berth in ALLOWED_BERTHS else None


class LineupRow(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nome_navio: str
    duv: str | None = None
    imo: str | None = None
    berco_programado: str | None = None
    tipo_carga: str
    status: str | None = None
    eta: datetime | None = None
    etd: datetime | None = None

    @field_validator("imo", mode="before")
    @classmethod
    def clean_imo(cls, value: Any) -> str | None:
        digits = re.sub(r"\D", "", str(value or ""))
        return digits if len(digits) == 7 else None

    @field_validator("duv", mode="before")
    @classmethod
    def clean_duv(cls, value: Any) -> str | None:
        cleaned = re.sub(r"\s+", "", str(value or ""))
        return cleaned or None


class EnrichmentRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nome_navio: str
    imo: str | None = None
    duv: str | None = None
    berco_programado: str | None = None
    tipo_carga: str | None = None
    eta: datetime | None = None
    etd: datetime | None = None
    status: str | None = None


def extract_cipp(html: str) -> list[LineupRow]:
    tables = pd.read_html(StringIO(html))
    rows: list[LineupRow] = []
    statuses = re.findall(
        r"<th[^>]*colspan[^>]*>\s*([^<]+?)\s*</th>",
        html,
        flags=re.I,
    )
    for index, table in enumerate(tables):
        table.columns = [str(value).strip() for value in table.columns]
        ship_col = column(table, ("Navio", "Embarcação"))
        cargo_col = column(table, ("Mercadoria", "Carga", "Tipo de carga"))
        if not ship_col or not cargo_col:
            continue
        duv_col = column(table, ("DUV",))
        imo_col = column(table, ("IMO",))
        berth_col = column(table, ("Berço", "Berço de atracação", "Berth"))
        eta_col = column(table, ("Chegada", "ETA"))
        etd_col = column(table, ("Saída", "ETD"))
        status = normalize_status(statuses[index] if index < len(statuses) else "")
        for record in table.to_dict("records"):
            rows.append(
                LineupRow(
                    nome_navio=str(record.get(ship_col, "")).strip(),
                    duv=record.get(duv_col) if duv_col else None,
                    imo=record.get(imo_col) if imo_col else None,
                    berco_programado=normalize_berth(record.get(berth_col)) if berth_col else None,
                    tipo_carga=str(record.get(cargo_col, "")).strip(),
                    status=status,
                    eta=parse_datetime(record.get(eta_col)) if eta_col else None,
                    etd=parse_datetime(record.get(etd_col)) if etd_col else None,
                )
            )
    return rows


def fetch_json_records(
    url: str | None,
    params: dict[str, str],
    timeout: int = 30,
    api_key: str | None = None,
) -> list[EnrichmentRecord]:
    if not url:
        return []
    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        headers["X-API-Key"] = api_key
    response = requests.get(url, params=params, headers=headers, timeout=timeout)
    response.raise_for_status()
    payload = response.json()
    records = (
        payload
        if isinstance(payload, list)
        else payload.get(
            "data",
            payload.get("ships", payload.get("vessels", payload.get("results", []))),
        )
    )
    if not isinstance(records, list):
        raise ValueError("O endpoint de enriquecimento deve retornar uma lista de navios.")
    return [EnrichmentRecord.model_validate(item) for item in records]


def enrich(rows: list[LineupRow], records: list[EnrichmentRecord], threshold: int = 92) -> list[LineupRow]:
    by_duv = {record.duv: record for record in records if record.duv}
    by_imo = {record.imo: record for record in records if record.imo}
    names = {norm(record.nome_navio): record for record in records}
    for row in rows:
        match = by_duv.get(row.duv) or by_imo.get(row.imo)
        if not match and names:
            candidate = process.extractOne(norm(row.nome_navio), names.keys(), scorer=fuzz.token_sort_ratio)
            if candidate and candidate[1] >= threshold:
                match = names[candidate[0]]
        if not match:
            continue
        row.imo = row.imo or match.imo
        row.duv = row.duv or match.duv
        row.berco_programado = row.berco_programado or normalize_berth(match.berco_programado)
        row.eta = row.eta or match.eta
        row.etd = row.etd or match.etd
        row.status = row.status or normalize_status(match.status)
        if not row.tipo_carga and match.tipo_carga:
            row.tipo_carga = match.tipo_carga
    return rows


def eligible(rows: list[LineupRow]) -> list[LineupRow]:
    result = []
    for row in rows:
        if not row.imo:
            continue
        if CONTAINER_PATTERN.search(row.tipo_carga):
            continue
        if LIQUID_BULK_PATTERN.search(row.tipo_carga) and not re.search(r"carga\s+projeto|project\s+cargo", row.tipo_carga, re.I):
            continue
        if not GENERAL_CARGO_PATTERN.search(row.tipo_carga):
            continue
        if not row.status or not row.eta:
            continue
        result.append(row)
    return result


def upsert(rows: list[LineupRow], supabase_url: str, service_role_key: str) -> None:
    payload = [
        {
            "nome_navio": row.nome_navio,
            "imo": row.imo,
            "duv": row.duv,
            "tipo_carga": row.tipo_carga or "Carga Geral",
            "berco_programado": row.berco_programado,
            "status": row.status,
            "eta": row.eta.isoformat() if row.eta else None,
            "etd": row.etd.isoformat() if row.etd else None,
            "fonte_dados": "SIC-TOS Oficial CIPP",
            "atualizado_em": datetime.now(timezone.utc).isoformat(),
        }
        for row in rows
    ]
    if not payload:
        return
    response = requests.post(
        f"{supabase_url.rstrip('/')}/rest/v1/previsao_navios?on_conflict=imo",
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        json=payload,
        timeout=30,
    )
    response.raise_for_status()


def run() -> dict[str, int]:
    lineup_url = os.getenv("PECEM_LINEUP_URL", DEFAULT_LINEUP_URL)
    response = requests.get(lineup_url, timeout=60)
    response.raise_for_status()
    rows = extract_cipp(response.text)
    enrichment = fetch_json_records(
        os.getenv("PECEM_ENRICHMENT_URL"),
        {"port": os.getenv("PECEM_PORT_CODE", "BRPEC")},
        api_key=os.getenv("PECEM_ENRICHMENT_API_KEY"),
    )
    rows = enrich(rows, enrichment)
    selected = eligible(rows)
    if selected:
        upsert(
            selected,
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return {"extracted": len(rows), "eligible": len(selected), "upserted": len(selected)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL do Line-Up oficial do Pecém")
    parser.parse_args()
    try:
        print(run())
    except (KeyError, requests.RequestException, ValidationError, ValueError) as error:
        raise SystemExit(f"ETL interrompido: {error}") from error
