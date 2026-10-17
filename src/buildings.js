// Retain all footprints in the data, but hide unclassified structures by
// default until reference imagery or local knowledge verifies them.
export function buildingProfile(tags = {}, { includeUnclassified = false } = {}) {
  const type = tags.building || "yes";
  if (type === "no" || tags["demolished:building"] || tags["removed:building"])
    return { kind: "omit" };
  if (type === "ruins" || tags.ruins === "yes" || tags["ruins:building"])
    return { kind: "ruin", height: 0.75, estimated: true };
  const knownUse = tags.amenity || tags.tourism || tags.shop || tags.office || tags['building:use'];
  if (type === 'yes' && !knownUse && !includeUnclassified)
    return {kind:'omit', reason:'unclassified'};
  const small = [
    "shed",
    "garage",
    "garages",
    "farm_auxiliary",
    "container",
    "static_caravan",
  ].includes(type);
  const greenhouse = type === "greenhouse";
  const explicit = Number.parseFloat(tags.height);
  const levels = Number.parseFloat(tags["building:levels"]);
  // Heights in OSM normally use metres; support explicitly tagged feet too.
  const measured =
    Number.isFinite(explicit) && explicit > 0
      ? explicit * (/ft|feet|'/.test(tags.height) ? 0.3048 : 1)
      : null;
  const height =
    measured ??
    (Number.isFinite(levels) && levels > 0
      ? levels * 2.8
      : greenhouse
        ? 2
        : small
          ? 2.1
          : 2.8);
  return {
    kind: greenhouse ? "greenhouse" : small ? "outbuilding" : "building",
    height: Math.max(0.5, Math.min(30, height)),
    estimated: measured === null,
  };
}
