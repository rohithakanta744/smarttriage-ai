"""Private Loki reader and durable authenticated Grafana inbox. No automatic AI spend."""
import hashlib
import hmac
import json
import os
import sqlite3
import time
from pathlib import Path
import httpx
from fastapi import HTTPException

def db():
    path = Path(os.getenv('ALERT_DB', './data/alerts.sqlite3'))
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.execute('CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, payload TEXT NOT NULL, received_at REAL NOT NULL)')
    return connection

def accept_alert(body: bytes, authorization: str | None):
    token = os.getenv('GRAFANA_WEBHOOK_TOKEN')
    if not token or not hmac.compare_digest(authorization or '', f'Bearer {token}'):
        raise HTTPException(401, 'Grafana webhook authorization required.')
    if len(body) > 1000000:
        raise HTTPException(413, 'Alert payload exceeds 1 MB.')
    try:
        payload = json.loads(body)
        alerts = payload['alerts']
        if not isinstance(alerts, list) or len(alerts) > 100:
            raise ValueError()
    except (ValueError, KeyError, TypeError):
        raise HTTPException(422, 'Expected a Grafana notification with up to 100 alerts.') from None
    accepted = 0
    with db() as connection:
        for alert in alerts:
            if not isinstance(alert, dict):
                raise HTTPException(422, 'Invalid alert object.')
            # Include lifecycle start/end so repeats deduplicate, future occurrences do not.
            identity = '|'.join(str(alert.get(k, '')) for k in ['fingerprint', 'status', 'startsAt', 'endsAt'])
            if not alert.get('fingerprint'):
                identity = json.dumps(alert, sort_keys=True)
            digest = hashlib.sha256(identity.encode()).hexdigest()
            accepted += connection.execute('INSERT OR IGNORE INTO alerts VALUES (?,?,?)', (digest, json.dumps(alert), time.time())).rowcount
    return {'accepted': accepted, 'automatic_diagnosis': False}

def read_alerts():
    with db() as connection:
        return [{'id': row[0], 'alert': json.loads(row[1]), 'received_at': row[2]} for row in connection.execute('SELECT id,payload,received_at FROM alerts ORDER BY received_at DESC LIMIT 100')]

async def query_loki(selector: str, contains: str, start: int, end: int):
    allowed = [s.strip() for s in os.getenv('LOKI_ALLOWED_SELECTORS', '').split(';') if s.strip()]
    if selector not in allowed:
        raise HTTPException(403, 'Select an approved Loki stream.')
    if end <= start or end - start > 3600:
        raise HTTPException(422, 'Select a time range of at most one hour.')
    base = os.getenv('LOKI_URL', '').rstrip('/')
    if not base:
        raise HTTPException(503, 'Configure LOKI_URL on the service.')
    query = selector + (' |= ' + json.dumps(contains) if contains else '')
    headers = {}
    if os.getenv('LOKI_TOKEN'):
        headers['Authorization'] = f"Bearer {os.getenv('LOKI_TOKEN')}"
    if os.getenv('LOKI_ORG_ID'):
        headers['X-Scope-OrgID'] = os.getenv('LOKI_ORG_ID')
    async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
        async with client.stream('GET', base + '/loki/api/v1/query_range', headers=headers, params={'query': query, 'start': str(start * 1000000000), 'end': str(end * 1000000000), 'limit': 500, 'direction': 'forward'}) as response:
            if response.status_code != 200:
                raise HTTPException(response.status_code, f'Loki rejected the query (HTTP {response.status_code}).')
            body = bytearray()
            async for chunk in response.aiter_bytes():
                body.extend(chunk)
                if len(body) > 2000000:
                    raise HTTPException(413, 'Loki response exceeds 2 MB; narrow the range.')
    payload = json.loads(body)
    if payload.get('status') != 'success' or payload.get('data', {}).get('resultType') != 'streams':
        raise HTTPException(502, 'Loki did not return log streams.')
    lines = sorted([(stamp, text) for stream in payload['data']['result'] for stamp, text in stream.get('values', [])], key=lambda v: int(v[0]))[:500]
    return {'log': '\n'.join(text for _, text in lines)[:50000], 'lines': len(lines)}
