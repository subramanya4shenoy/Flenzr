"""Seed disposable users and campaign drafts only on the isolated Step 32 API."""
import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
import httpx
import jwt
from app.core.config import settings

API = 'http://127.0.0.1:8332/api/v1'
SECRET = 'multi-creator-regression-signing-secret-not-real'


def main():
    stamp = int(time.time())
    if not os.getenv('FLENZR_QA_API_PID'):
        raise SystemExit('Set FLENZR_QA_API_PID to the explicitly started isolated API worker PID.')
    fixture = {'api_pid': int(os.environ['FLENZR_QA_API_PID']),
               'database_path': os.getenv('FLENZR_QA_DATABASE_PATH', '/tmp/flenzr-multi-creator-20261126.sqlite')}
    with httpx.Client(base_url=API, timeout=30) as client:
        def request(role, method, path, body=None):
            r = client.request(method, path, headers={'Authorization': 'Bearer ' + fixture[role]['token']}, json=body)
            r.raise_for_status()
            return r.json()
        for role in ('brand', 'creator', 'creator2', 'outsider'):
            token = jwt.encode(dict(sub=f'multi-qa-{role}-{stamp}', email=f'multi-qa-{role}-{stamp}@example.com',
                aud='authenticated', iss=settings.SUPABASE_URL.rstrip('/') + '/auth/v1', role='authenticated',
                iat=stamp, exp=stamp + 14400, user_metadata={'full_name': 'Journey ' + role, 'avatar_url': '/logo.svg'}), SECRET, algorithm='HS256')
            fixture[role] = {'token': token}
            user = request(role, 'POST', '/identity/sync', {'role': 'brand_owner' if role == 'brand' else 'creator'})
            fixture[role]['user_id'] = user['user']['id']
            if role != 'brand':
                fixture[role]['profile'] = request(role, 'PATCH', '/creators/me', {'display_name': 'Journey ' + role,
                    'bio': 'Isolated multi-creator browser regression account.', 'niche': 'Technology'})
        fixture['organization'] = request('brand', 'POST', '/organizations', {'name': f'Journey QA Brand {stamp}', 'billing_email': f'journey-{stamp}@example.com'})
        fixture['folder'] = request('brand', 'POST', '/campaigns/folders', {'request_id': str(uuid4()), 'title': 'Journey multi-creator launch', 'objective': 'Verify independent creator workflows.'})
        fixture['offers'] = []
        for visibility in ('invited', 'public'):
            fixture['offers'].append(request('brand', 'POST', '/campaigns/drafts', {'request_id': str(uuid4()),
                'parent_campaign_id': fixture['folder']['id'], 'title': 'Journey ' + visibility + ' offer',
                'brief': 'Create an honest launch review for our test product.', 'deliverable_summary': 'One original review video',
                'target_niche': 'Technology', 'budget_total_cents': 500000, 'currency': 'INR', 'visibility': visibility,
                'end_date': (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()}))
    fixture['delivery_date'] = (datetime.now(timezone.utc).date() + timedelta(days=10)).isoformat()
    output = Path('/tmp/flenzr-multi-creator-fixture.json')
    output.write_text(json.dumps(fixture)); os.chmod(output, 0o600)
    print('Seeded four isolated accounts, one campaign and two draft offers. Test tokens kept in mode-0600 fixture.')


if __name__ == '__main__':
    main()
