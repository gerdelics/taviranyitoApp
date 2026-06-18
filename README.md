# Távirányító · POIs

Standalone PWA extracted from `flowapp`: a full-screen map where you place,
edit, navigate to, and manage POI markers with optional "ráfordító" (approach)
waypoints.

## Features

- Full-screen Leaflet map (OpenStreetMap tiles).
- **Long-press the map** to drop a marker; the editor opens immediately. The
  marker is only kept if you **Save** — Cancel / outside-click discards it.
- **Add new marker** button for manual `lat, lon` entry (paste from Google Maps).
- Per-marker **Type** (roadworks / closure / road alert) and **Description**.
- **Ráfordító (approach point):** placed on the map; drawn as a dim dot with a
  dashed connector and a direction arrow pointing toward the marker.
- **Long-press a marker** (POI or ráfordító) to drag it to a new position.
- **Mark as done** → marker turns green and shows `-`; the remaining markers
  renumber. The nearest not-done marker is blue, the rest red.
- **Navigate** opens / copies a Google Maps directions link
  (`current location → ráfordító → marker`, using the ráfordító as a waypoint).

Markers live in memory only (PoC) — they reset on reload.

## Tech

React 19 · Vite · Tailwind CSS · Leaflet. Component layer follows atomic design
(`components/organisms`).

## Develop

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
```
