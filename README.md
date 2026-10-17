# Bofin Racer

A playable browser prototype of Inishbofin, Co. Galway. Drive actual mapped roads across real Copernicus terrain at one metre per world unit.

## Play

Double-click **Launch Bofin Racer.command** on this Mac. It starts the local server and opens the game. Keep its terminal window open while playing; close it to stop the server.

Alternatively, with Node.js 22.12+ installed:

```sh
npm install
npm run dev
```

Open the local address printed by Vite (usually http://127.0.0.1:5173).

- W / Up: accelerate
- S / Down: brake, then reverse
- A / D or Left / Right: steer
- Space: handbrake
- C: chase camera / driver view
- R: return to the nearest mapped road
- H: return to the harbour start
- Esc: pause / resume

Touch buttons are available on narrow screens. Switching windows pauses the game; press Esc to resume.

## Included

Three.js scenery, driveable car, speed-sensitive steering, chase and driver cameras, minimap with position marker, distance counter, building and shoreline collisions, real road junctions, basic island scenery, and reset to the nearest road.

## Data and accuracy

Data downloaded on 13 October 2026 and bundled locally: no map API keys or live map requests are required to play.

- `public/data/roads.geojson`: 122 mapped highway ways (including footpaths). Motor roads are rendered for driving; paths/steps are excluded.
- `public/data/island.json`: the main Inishbofin coastline and 418 mapped building footprints. Neighbouring islands and their roads are excluded using the coastline polygon.
- `public/data/terrain.json`: a 241 × 241 sample grid from Copernicus GLO-30 tile N53 W011. Triangle interpolation matching the terrain mesh places roads, houses and car on the terrain.

[OpenStreetMap contributors](https://www.openstreetmap.org/copyright), © contributors, ODbL. The downloaded map extract is a derivative database under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Attribution appears in the game. OpenStreetMap road positions are mapped data, not survey measurements.

[Copernicus DEM GLO-30](https://registry.opendata.aws/copernicus-dem/). © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018. Produced using Copernicus data and information. See [dataset access and licence](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM). Source is a surface model at approximately 30 m resolution, not a detailed road survey.

Longitude/latitude are converted to a local equirectangular metric projection around 53.62° N, 10.213° W. This is an approximation appropriate to the island's small extent. Road widths default to 3.5 m when no usable OSM width exists. Building footprints are retained from OSM. The 53 mapped ruins render as open stone wall outlines, and sheds, garages and other outbuildings use smaller models. Available height/storey tags take precedence; missing heights default to 2.8 m for unspecified buildings and houses, 2.1 m for outbuildings and 2 m for greenhouses. These fallback heights and ruin wall heights are estimates, not measurements. The 190 footprints tagged only `building=yes` have not been independently verified as homes or outbuildings. Road materials, rock placement and water are stylised. Junctions use overlapping road surfaces. Driving uses simple arcade physics; no detailed suspension, traffic or survey-grade road camber is simulated.

## Build and checks

```sh
npm test
npm run build
npm run preview
```

Upload `dist/` to any static web host. The build uses relative asset paths. Google Fonts enhance the interface when online; system fonts work without them.

## Refresh data

`scripts/prepare-data.py` converts an OSM XML extract (`/tmp/bofin.osm`) and the Copernicus COG (`/tmp/bofin-dem.tif`). It requires Python, numpy, tifffile and imagecodecs. The source bbox is -10.27, 53.59, -10.17, 53.65. The main coastline polygon filters out neighbouring islands. Runtime and build do not require Python.

## Harbour and Low Road detail pass

The harbour start is beside the ferry-pier approach, facing towards the church and Low Road. Press H to return to Church start.

- 66 mapped harbour-area features are bundled in `public/data/harbour.json`: the ferry and old piers, stone boundaries and parking areas. Walls have collision geometry; piers have flat driveable decks, including over water.
- Building footprints receive pitched roofs (except explicit flat roofs and utility structures). Harbour buildings also have illustrative window details. Roof rise, window placement and the church height are estimates.
- Roads use mapped surface/road types and lane counts. There are no explicit width tags in this extract: two-lane sections default to 5.5 m, tracks to 2.6 m, service roads to 3 m, and other roads to 3.5 m. These are estimates awaiting imagery measurement or a ground survey.
- Pier top levels are approximated from the highest DEM sample along each mapped perimeter. Bollard spacing and wall heights without tags are estimates.
- The existing ~30 m surface model is retained; this pass does not introduce a new terrain survey or claim to independently validate all 190 unspecified building footprints.

Visual reference: [Irish Islands Heritage / CLIC Project harbour photographs](https://www.archaeologyirishislands.org/inishbofin), viewed 13 October 2026. The photographs informed roof and harbour appearance; they are not redistributed as game textures. Geometry remains derived from OpenStreetMap. Use `python scripts/extract-harbour.py` to regenerate the harbour extract from the original OSM XML.

## Conservative building visibility

Unspecified `building=yes` footprints without a mapped amenity, tourism, shop, office or building-use tag are hidden by default. The 190 unspecified footprints remain in the source data; this filter removes assumptions from the visible scene rather than certifying the true island building count. Explicit houses, hotels, church, outbuildings and identified amenities remain. Hidden structures should be restored individually after verification against reference imagery or local knowledge.

## Start-location menu

Before driving, choose Church start, Old Pier, North Beach Challenge, Tommy the Bogs or Clossey Challenge. Changing the selection previews the location and updates the minimap. Start positions snap to mapped through-roads and avoid rendered building/wall interiors. H returns to Church start; R resets to the nearest road.

## Road smoothing

Road corners use short quadratic curves sampled at approximately 1.5 m spacing. Curve trimming is limited by bend angle and adjacent segment lengths; shared junction coordinates and endpoints stay fixed. The same smoothed centrelines drive road rendering, minimap drawing, speed-surface detection and road resets. The source GeoJSON remains unchanged. This is a visual approximation rather than a new road survey.

## Junction rendering

Shared road nodes receive terrain-following paved junction fills and matching verge fills. Road ribbons now sample across their width at approximately 0.6 m intervals, rather than spanning the whole road with one quad. Limited miter joins preserve bend widths; a small elevation offset prevents terrain triangles from appearing through the pavement. Junction shape is approximate, while the mapped node positions remain fixed.

## Mid-drive menu and boost

Click Locations or press M during a drive to pause and reopen the start menu. Choose a location and click Drive from here to move there, or use Resume current drive / Esc to return to your saved position. Click Boost or press B to toggle faster acceleration and a higher top speed (approximately 137 km/h on roads). Boost remains enabled until toggled off.

## Clossey Challenge drains

Two fictional gameplay drains sit beside the midpoint of road 215535456 between the coastal and inland T-junctions. Each follows the road from the original midpoint section to the northern T-junction verge, with 2.6 m width, 3 m depth and sloped sides. Connecting junction pavement is preserved. The drains have no warning signs. Entering a deep section stops the car; press R to recover. These are user-requested obstacles, not surveyed island features.

Church start replaces the ferry-harbour starting option. It is on Low Road beside the church, roughly 200 m along the route from the former start, facing back towards the ferry harbour.

## Vehicle selection

Choose Dave's Jeep, MJ's Tractor or Pat's Dumper beside the route selector. The thumbnail is rendered from the same 3D model used in the game, and selection previews the vehicle immediately. Use Locations / M to change vehicle for a new start; Resume current drive restores the vehicle from that drive. Vehicles currently share the arcade driving controls and speed settings.

## Touch driving

On phones, the smaller minimap sits at the top right. Steering buttons are on the left, acceleration and brake/reverse on the right. Hold two buttons with separate fingers to steer while accelerating. The complete pressed button highlights; SVG arrows cannot be selected as text. Inputs clear on release, cancellation, backgrounding or opening the menu. Touching a driving control resumes a drive paused by switching apps. The mobile toolbar fits all menu, boost, reset and camera controls.

## Timed routes and personal-best ghosts

Choose a vehicle and a course under **Timed routes**, then click **Start timed route**. After the three-second countdown, follow the green road guide and pass each green checkpoint in order. The minimap highlights the course and next checkpoint. Courses: Clossey Challenge (coastal junction to inland junction, past the drains), Murrays → The Pub, Hostel to The Galley, and North Beach to New Pier.

Completed personal bests and their ghost recordings are stored per course and vehicle in this browser. Complete a first run to create a ghost; the next attempt shows that vehicle as a translucent opponent. Slower attempts preserve the existing best. Clearing browser storage removes records. Storage failures are reported at the finish.

Boost is allowed during timed runs: press B or tap Boost. Boosted and unboosted attempts share the same personal best. Pausing or backgrounding pauses the timer. Resetting, returning to Church, entering a drain or opening the locations menu ends the attempt. Use **End run** to continue free driving. Attempts have a 30-minute limit.

## Secret airstrip playground

A fictional arcade driving area sits around Inishbofin's airstrip, centred on the OurAirports IE-0007 location (53.6196, -10.21085). Runway alignment, access lane, drift loop, surface grading and speed pads are gameplay approximations, not surveyed airport geometry.

In Free drive, take the inland lane north of the church and look for the cyan gate at the southern end of the airstrip. Drive through it to unlock the playground. The runway has a long straight, a wide outer drift loop and a paved skid area. Cyan/lime arrow pads launch the vehicle above 220 km/h and give 3.5 seconds of extra acceleration. Use Space or the mobile handbrake to slide through turns. Turbo ends on leaving the arena; normal vehicle handling returns outside it. Entering the playground ends an active time trial, preserving existing records.
