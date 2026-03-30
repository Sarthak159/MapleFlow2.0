# Maple Flow Bus Tracker

Maple Flow now uses the live Ohio State University bus API for route geometry, stop locations, live vehicle positions, and stop arrival predictions. Estimated crowding and comfort metrics are still derived from the historical CSV dataset and are labeled as estimates in the UI.

## Development

Install dependencies:

```bash
npm install
```

Run the React app and the local OSU bus proxy together:

```bash
npm start
```

The React client runs on `http://localhost:3000` and the local proxy runs on `http://localhost:3001`.

## Production

Create the frontend build:

```bash
npm run build
```

Serve the production build and API proxy from Express:

```bash
npm run serve
```

## API

The app exposes one local backend endpoint:

- `GET /api/osu-bus/snapshot`

This endpoint:

- fetches the live OSU route list, route details, and per-route vehicles
- normalizes the data into route, stop, and vehicle arrays for the frontend
- caches the last good snapshot for 15 seconds
- serves stale cached data if the upstream OSU API temporarily fails

## Testing

Server normalization tests:

```bash
npm run test:server
```

Frontend build verification:

```bash
npm run build
```
