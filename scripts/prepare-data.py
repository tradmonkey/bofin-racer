"""Convert a downloaded OSM XML extract and Copernicus COG into browser assets.
Usage: PYTHONPATH=/tmp/bofin-python python scripts/prepare-data.py
Raw inputs: /tmp/bofin.osm and /tmp/bofin-dem.tif.
"""
import json, xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
import tifffile
out=Path('public/data');out.mkdir(parents=True,exist_ok=True)
t=tifffile.TiffFile('/tmp/bofin-dem.tif');p=t.pages[0];a=p.asarray();sx,sy,_=p.tags[33550].value;ox,oy=p.tags[33922].value[3:5]
bounds=[-10.27,53.59,-10.17,53.65];w,h=241,241
lons=np.linspace(bounds[0],bounds[2],w);lats=np.linspace(bounds[3],bounds[1],h)
cols=np.clip(np.rint((lons-ox)/sx).astype(int),0,a.shape[1]-1);rows=np.clip(np.rint((oy-lats)/sy).astype(int),0,a.shape[0]-1)
vals=a[np.ix_(rows,cols)].round(2)
(out/'terrain.json').write_text(json.dumps(dict(width=w,height=h,bounds=bounds,values=vals.ravel().tolist(),source='Copernicus DEM GLO-30, N53 W011, downloaded 2026-10-13'),separators=(',',':')))
root=ET.parse('/tmp/bofin.osm').getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')}
ways=[];coasts=[]
for way in root.findall('way'):
 tags={x.get('k'):x.get('v') for x in way.findall('tag')};refs=[x.get('ref') for x in way.findall('nd')];coords=[nodes[r] for r in refs if r in nodes]
 if len(coords)<2:continue
 if tags.get('natural')=='coastline':coasts.append(coords)
 ways.append((way.get('id'),tags,coords))
rings=[]
while coasts:
 line=coasts.pop()
 while line[0]!=line[-1]:
  found=False
  for i,c in enumerate(coasts):
   if line[-1]==c[0]:line+=c[1:]
   elif line[-1]==c[-1]:line+=c[-2::-1]
   elif line[0]==c[-1]:line=c[:-1]+line
   elif line[0]==c[0]:line=c[:0:-1]+line
   else:continue
   coasts.pop(i);found=True;break
  if not found:break
 if line[0]==line[-1]:rings.append(line)
def area(r):return abs(sum(r[i][0]*r[i-1][1]-r[i-1][0]*r[i][1] for i in range(len(r))))
ring=max(rings,key=area)
def inside(pt):
 x,y=pt;c=False
 for i in range(len(ring)):
  a,b=ring[i],ring[i-1]
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:c=not c
 return c
features=[];buildings=[]
for id,tags,coords in ways:
 if not any(inside(c) for c in coords):continue
 if 'highway' in tags:features.append(dict(type='Feature',id=id,properties=tags,geometry=dict(type='LineString',coordinates=coords)))
 if 'building' in tags:buildings.append(dict(id=id,tags=tags,coordinates=coords))
(out/'roads.geojson').write_text(json.dumps(dict(type='FeatureCollection',features=features),separators=(',',':')))
(out/'island.json').write_text(json.dumps(dict(coastline=ring,buildings=buildings,source='OpenStreetMap contributors, downloaded 2026-10-13'),separators=(',',':')))
print(f'{len(features)} mapped ways, {len(buildings)} buildings, {len(ring)} coast points; terrain {vals.min()}–{vals.max()} m')
