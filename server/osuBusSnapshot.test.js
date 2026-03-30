const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeSnapshot } = require("./osuBusSnapshot");
const { normalizeStopName } = require("./crowdEstimator");

function createFixture() {
  return {
    routesPayload: {
      lastModified: "2026-03-30T15:00:00.000Z",
      data: {
        routes: [
          {
            code: "CC",
            name: "Campus Connector",
            service: "clever",
            color: "#005716",
            darkColor: "#0A8721",
            showByDefault: true,
          },
        ],
      },
    },
    routeDetails: [
      {
        routeCode: "CC",
        detailPayload: {
          lastModified: "2026-03-30T15:01:00.000Z",
          data: {
            patterns: [
              {
                id: "1",
                direction: "ib",
                length: 100,
                encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
              },
            ],
            stops: [
              {
                id: "18",
                name: "Kinnear Road Lot",
                latitude: 39.997739,
                longitude: -83.037975,
              },
              {
                id: "20",
                name: "Midwest Campus (Eastbound)",
                latitude: 40.004251,
                longitude: -83.026541,
              },
            ],
          },
        },
        vehiclesPayload: {
          lastModified: "2026-03-30T15:02:00.000Z",
          data: {
            vehicles: [
              {
                id: "1801",
                bus_id: "1801",
                routeCode: "CC",
                destination: "Central Campus",
                delayed: false,
                heading: 154,
                speed: 9,
                latitude: 39.99785,
                longitude: -83.03,
                updated: "2026-03-30T15:52:00.000Z",
                lastStop: null,
                predictions: [
                  {
                    stopId: "20",
                    stopName: "Midwest Campus (Eastbound)",
                    predictionTime: "2026-03-30T15:54:00.000Z",
                    systemTime: "2026-03-30T15:52:00.000Z",
                    timeToArrivalInSeconds: 120,
                    vehicleDistanceInFeet: 1793,
                    isDelayed: false,
                  },
                  {
                    stopId: "18",
                    stopName: "Kinnear Road Lot",
                    predictionTime: "2026-03-30T15:58:00.000Z",
                    systemTime: "2026-03-30T15:52:00.000Z",
                    timeToArrivalInSeconds: 360,
                    vehicleDistanceInFeet: 3793,
                    isDelayed: false,
                  },
                ],
              },
            ],
          },
        },
      },
    ],
  };
}

test("normalizeSnapshot merges routes, stops, and vehicles into a frontend snapshot", () => {
  const fixture = createFixture();
  const snapshot = normalizeSnapshot(fixture.routesPayload, fixture.routeDetails);

  assert.equal(snapshot.routes.length, 1);
  assert.equal(snapshot.stops.length, 2);
  assert.equal(snapshot.vehicles.length, 1);
  assert.equal(snapshot.sourceLastModified, "2026-03-30T15:02:00.000Z");
  assert.equal(snapshot.routes[0].paths[0].points.length, 3);
});

test("normalizeSnapshot converts arrival predictions into eta minutes and next stops", () => {
  const fixture = createFixture();
  const snapshot = normalizeSnapshot(fixture.routesPayload, fixture.routeDetails);
  const vehicle = snapshot.vehicles[0];

  assert.equal(vehicle.etaMinutes, 2);
  assert.equal(vehicle.currentStopId, null);
  assert.equal(vehicle.currentStopName, null);
  assert.deepEqual(vehicle.nextStops.map((stop) => stop.stopId), ["20", "18"]);
});

test("normalizeStopName handles stop-name aliases used by the live feed", () => {
  assert.equal(normalizeStopName("Midwest Campus (Eastbound)"), "midwest campus");
  assert.equal(normalizeStopName("Kinnear Road Lot"), "kinnear rd lot");
  assert.equal(normalizeStopName("Ohio Union (Southbound)"), "ohio union");
});
