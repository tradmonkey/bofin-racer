"""Extract the harbour study-area features from the original OSM XML download.
Usage: python scripts/extract-harbour.py [/path/to/extract.osm]
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
root = ET.parse(sys.argv[1] if len(sys.argv)>1 else '/tmp/bofin.osm').getroot()
nodes = {n.get('id'): [float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')}
features=[]
for way in root.findall('way'):
    tags={t.get('k'):t.get('v') for t in way.findall('tag')}
    coords=[nodes[n.get('ref')] for n in way.findall('nd') if n.get('ref') in nodes]
    if not any(-10.235<p[0]<-10.185 and 53.610<p[1]<53.620 for p in coords):
        continue
    if (tags.get('barrier')=='wall' and tags.get('indoor')!='yes') or tags.get('man_made') in ('pier','breakwater') or tags.get('amenity')=='parking':
        features.append(dict(id=way.get('id'),tags=tags,coordinates=coords))
Path('public/data/harbour.json').write_text(json.dumps(dict(source='OpenStreetMap contributors, extract downloaded 2026-10-13',features=features),separators=(',',':')))
print(f'{len(features)} harbour-area features extracted')
