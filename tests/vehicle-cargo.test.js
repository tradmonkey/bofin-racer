import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VEHICLES, makeVehicle, disposeVehicle } from '../src/vehicles.js';
import { setPalletCargo } from '../src/vehicle-cargo.js';

test('pallet stacks sit above every vehicle roof and are removed cleanly', () => {
  for (const {id} of VEHICLES) {
    const vehicle = makeVehicle(id);
    const roof = new THREE.Box3().setFromObject(vehicle).max.y;
    vehicle.position.set(120, 30, -250); vehicle.rotation.y = 1.2;
    const children = vehicle.children.length;
    setPalletCargo(vehicle, true);
    const cargo = vehicle.getObjectByName('pallet-cargo');
    assert.ok(Math.abs(cargo.position.y - roof - 0.04) < 0.001, id);
    assert.equal(cargo.children.filter(o => o.isGroup).length, 3);
    setPalletCargo(vehicle, true);
    assert.equal(vehicle.children.length, children + 1);
    setPalletCargo(vehicle, false);
    assert.equal(vehicle.children.length, children);
    disposeVehicle(vehicle);
  }
});
