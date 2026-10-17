import test from "node:test";
import assert from "node:assert/strict";
import { VEHICLES, makeVehicle, disposeVehicle } from "../src/vehicles.js";
test("each vehicle has its own model, appropriate wheels and driver eye height", () => {
  for (const v of VEHICLES) {
    const model = makeVehicle(v.id);
    assert.equal(model.userData.vehicleType, v.id);
    assert.equal(model.userData.wheels.length, v.id === "h50" ? 2 : 4);
    assert.ok(model.userData.eyeHeight > 1);
    for (const wheel of model.userData.wheels)
      assert.ok(wheel.userData.radius > 0);
    disposeVehicle(model);
  }
});
