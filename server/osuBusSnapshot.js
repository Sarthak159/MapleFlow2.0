const axios = require("axios");
const { decodePolyline } = require("./polyline");
const { estimator } = require("./crowdEstimator");

const BASE_URL = "https://content.osu.edu/v2/bus/routes";
const REQUEST_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 15000;

const apiClient = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
});

let cache = {
  fetchedAt: 0,
  snapshot: null,
  lastGoodSnapshot: null,
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function fetchJson(url) {
  const response = await apiClient.get(url);
  return response.data;
}

function pickMostRelevantTime(vehicle, predictions) {
  if (predictions.length > 0) {
    return predictions[0].systemTime || predictions[0].predictionTime;
  }

  return vehicle.updated || new Date().toISOString();
}

function normalizePrediction(prediction) {
  const etaMinutes = Math.max(
    0,
    Math.round((prediction.timeToArrivalInSeconds || 0) / 60)
  );

  return {
    stopId: String(prediction.stopId),
    stopName: prediction.stopName,
    etaMinutes,
    arrivalTime: prediction.predictionTime,
    isDelayed: Boolean(prediction.isDelayed),
    vehicleDistanceInFeet: prediction.vehicleDistanceInFeet ?? null,
  };
}

function extractCurrentStop(lastStop) {
  if (!lastStop) {
    return {
      currentStopId: null,
      currentStopName: null,
    };
  }

  if (typeof lastStop === "string") {
    return {
      currentStopId: null,
      currentStopName: lastStop,
    };
  }

  return {
    currentStopId: lastStop.id ? String(lastStop.id) : null,
    currentStopName: lastStop.name || null,
  };
}

function normalizeVehicle(vehicle, route, predictions) {
  const nextStops = predictions.slice(0, 3).map(normalizePrediction);
  const firstPrediction = nextStops[0] || null;
  const currentStop = extractCurrentStop(vehicle.lastStop);
  const estimate = estimator.estimate({
    routeName: route.name,
    stopName: currentStop.currentStopName || firstPrediction?.stopName,
    dateLike: pickMostRelevantTime(vehicle, predictions),
  });

  return {
    id: String(vehicle.id || vehicle.bus_id),
    busId: String(vehicle.bus_id || vehicle.id),
    route: route.code,
    routeCode: route.code,
    routeName: route.name,
    destination: vehicle.destination || route.name,
    delayed: Boolean(vehicle.delayed),
    heading: vehicle.heading ?? null,
    speed: vehicle.speed ?? null,
    updatedAt: vehicle.updated || null,
    location: {
      lat: vehicle.latitude,
      lng: vehicle.longitude,
    },
    currentStopId: currentStop.currentStopId,
    currentStopName: currentStop.currentStopName,
    eta: firstPrediction ? firstPrediction.etaMinutes : null,
    etaMinutes: firstPrediction ? firstPrediction.etaMinutes : null,
    nextStops,
    ...estimate,
  };
}

function normalizeSnapshot(routesPayload, routeDetails) {
  const routeSummaries = asArray(routesPayload?.data?.routes);
  const routeMap = new Map(routeSummaries.map((route) => [route.code, route]));
  const stopMap = new Map();
  const vehicles = [];
  const lastModifiedValues = [routesPayload?.lastModified].filter(Boolean);

  const routes = routeDetails.map(({ routeCode, detailPayload, vehiclesPayload }) => {
    const routeSummary = routeMap.get(routeCode);
    const routeStops = asArray(detailPayload?.data?.stops);
    const patterns = asArray(detailPayload?.data?.patterns);
    const rawVehicles = asArray(vehiclesPayload?.data?.vehicles);
    lastModifiedValues.push(detailPayload?.lastModified, vehiclesPayload?.lastModified);

    const normalizedStops = routeStops.map((stop) => {
      const stopId = String(stop.id);
      const existingStop = stopMap.get(stopId);

      if (existingStop) {
        existingStop.routeCodes = Array.from(new Set([...existingStop.routeCodes, routeCode]));
      } else {
        stopMap.set(stopId, {
          id: stopId,
          name: stop.name,
          location: {
            lat: stop.latitude,
            lng: stop.longitude,
          },
          routeCodes: [routeCode],
          isFavorite: false,
        });
      }

      return {
        id: stopId,
        name: stop.name,
        location: {
          lat: stop.latitude,
          lng: stop.longitude,
        },
      };
    });

    rawVehicles.forEach((vehicle) => {
      const predictions = asArray(vehicle.predictions).sort((left, right) => {
        return (left.timeToArrivalInSeconds || 0) - (right.timeToArrivalInSeconds || 0);
      });

      vehicles.push(normalizeVehicle(vehicle, routeSummary, predictions));
    });

    return {
      code: routeSummary.code,
      name: routeSummary.name,
      service: routeSummary.service,
      color: routeSummary.color,
      darkColor: routeSummary.darkColor,
      showByDefault: routeSummary.showByDefault,
      stops: normalizedStops,
      paths: patterns.map((pattern) => ({
        id: String(pattern.id),
        direction: pattern.direction,
        length: pattern.length,
        points: decodePolyline(pattern.encodedPolyline),
      })),
    };
  });

  const sourceLastModified = lastModifiedValues
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return {
    generatedAt: new Date().toISOString(),
    sourceLastModified,
    stale: false,
    dataSource: "OSU Bus API",
    routes,
    stops: Array.from(stopMap.values()).sort((left, right) => left.name.localeCompare(right.name)),
    vehicles: vehicles.sort((left, right) => {
      const leftEta = left.etaMinutes ?? Number.MAX_SAFE_INTEGER;
      const rightEta = right.etaMinutes ?? Number.MAX_SAFE_INTEGER;
      return leftEta - rightEta;
    }),
  };
}

async function fetchSnapshotFromUpstream() {
  const routesPayload = await fetchJson(BASE_URL);
  const routes = asArray(routesPayload?.data?.routes);

  const routeDetails = await Promise.all(
    routes.map(async (route) => {
      const [detailPayload, vehiclesPayload] = await Promise.all([
        fetchJson(`${BASE_URL}/${route.code}`),
        fetchJson(`${BASE_URL}/${route.code}/vehicles`),
      ]);

      return {
        routeCode: route.code,
        detailPayload,
        vehiclesPayload,
      };
    })
  );

  return normalizeSnapshot(routesPayload, routeDetails);
}

async function getSnapshot() {
  const now = Date.now();

  if (cache.snapshot && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.snapshot;
  }

  try {
    const snapshot = await fetchSnapshotFromUpstream();
    cache = {
      fetchedAt: now,
      snapshot,
      lastGoodSnapshot: snapshot,
    };
    return snapshot;
  } catch (error) {
    if (cache.lastGoodSnapshot) {
      return {
        ...cache.lastGoodSnapshot,
        stale: true,
        generatedAt: new Date().toISOString(),
      };
    }

    throw error;
  }
}

function resetSnapshotCache() {
  cache = {
    fetchedAt: 0,
    snapshot: null,
    lastGoodSnapshot: null,
  };
}

module.exports = {
  CACHE_TTL_MS,
  REQUEST_TIMEOUT_MS,
  fetchSnapshotFromUpstream,
  getSnapshot,
  normalizeSnapshot,
  normalizePrediction,
  normalizeVehicle,
  resetSnapshotCache,
};
