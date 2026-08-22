import base64
import requests
import json
import os

IMG = os.path.join('dataset', 'female', '42_1_4_20170117171425948.jpg.chip.jpg')
URL = 'http://127.0.0.1:5000/predict'

if not os.path.exists(IMG):
    raise SystemExit('Sample image not found: ' + IMG)

with open(IMG, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('ascii')

payload = {'image': 'data:image/jpeg;base64,' + b64}

try:
    r = requests.post(URL, json=payload, timeout=30)
    print('STATUS', r.status_code)
    print(r.text)
except Exception as e:
    print('ERROR', e)
