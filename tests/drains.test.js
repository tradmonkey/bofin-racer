import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { challengeDrain, drainDepth } from "../src/drains.js";
const d = challengeDrain(
  JSON.parse(
    fs.readFileSync(new URL("../public/data/roads.geojson", import.meta.url)),
  ),
);
test("both roadside drains are deep while the road stays intact", () => {
  for (const side of [-1, 1]) {
    const offset = side * (d.inner + d.width / 2);
    assert.ok(
      Math.abs(
        drainDepth(
          d.center[0] + d.normal[0] * offset,
          d.center[1] + d.normal[1] * offset,
          d,
        ) - 3,
      ) < 1e-6,
    );
  }
  assert.equal(drainDepth(...d.center, d), 0);
  assert.equal(
    drainDepth(
      d.center[0] + d.forward[0] * 30,
      d.center[1] + d.forward[1] * 30,
      d,
    ),
    0,
  );
});
test('drains reach the northern approach while leaving T-junction pavement intact',()=>{
 const s=d.segments.find(s=>s.start+s.length>=d.end-12),t=(d.end-12-s.start)/s.length;
 const center=[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t],normal=[(s.b[1]-s.a[1])/s.length,-(s.b[0]-s.a[0])/s.length];
 for(const side of [-1,1]){const offset=side*(d.inner+d.width/2);assert.ok(drainDepth(center[0]+normal[0]*offset,center[1]+normal[1]*offset,d)>2.8);}
 assert.equal(drainDepth(...d.north,d),0);
});
