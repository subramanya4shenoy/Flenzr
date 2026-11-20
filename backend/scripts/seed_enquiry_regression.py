"""Seed only the isolated P05 API on port 8312; never use production credentials."""
import json
import os
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
import httpx
import jwt

SECRET = 'p05-regression-only-signing-secret-not-real'
API = 'http://127.0.0.1:8312/api/v1'


def main():
    stamp = int(time.time())
    result = {}
    with httpx.Client(base_url=API) as client:
        for role, system_role in [('creator', 'creator'), ('brand', 'brand_owner'), ('outsider', 'creator')]:
            token = jwt.encode({'sub': 'p05-regression-' + role + '-' + str(stamp), 'email': 'p05-' + role + '-' + str(stamp) + '@example.com',
                'aud': 'authenticated', 'iss': 'https://example.supabase.co/auth/v1', 'role': 'authenticated',
                'iat': stamp, 'exp': stamp + 7200, 'user_metadata': {'full_name': 'P05 ' + role}}, SECRET, algorithm='HS256')
            headers = {'Authorization': 'Bearer ' + token}
            response = client.post('/identity/sync', headers=headers, json={'role': system_role})
            response.raise_for_status()
            result[role] = {'token': token, 'user_id': response.json()['user']['id']}
        headers = {'Authorization': 'Bearer ' + result['creator']['token']}
        response = client.patch('/creators/me', headers=headers, json={'display_name': 'P05 Test Creator',
            'bio': 'Disposable creator profile for collaboration regression checks.', 'niche': 'Technology'})
        response.raise_for_status()
        result['profile'] = response.json()
        # Always use a fresh SQLite file for a complete run.
        response = client.post('/ratecards', headers=headers, json={'platform': 'instagram',
            'deliverable_type': 'reel_shorts', 'title': 'P05 product Reel', 'base_price_cents': 250000,
            'currency': 'INR', 'turnaround_days': 5})
        response.raise_for_status()
        result['package'] = response.json()
    result['delivery_date'] = (datetime.now(timezone.utc).date() + timedelta(days=10)).isoformat()
    destination = Path('/tmp/flenzr-p05-regression-fixture.json')
    destination.write_text(json.dumps(result))
    os.chmod(destination, 0o600)
    print('Isolated creator, brand, outsider and package are ready.')


if __name__ == '__main__':
    main()
