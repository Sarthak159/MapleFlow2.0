const fs = require("fs");
const path = require("path");

const DEFAULT_CAPACITY = 50;
const DEFAULT_TIME_ZONE = "America/New_York";

const STOP_ALIASES = {
  "mount hall loop": "mount hall",
  "carmack 5 stop 1": "carmack 5",
  "carmack 5 stop 2": "carmack 5",
  "kinnear road lot": "kinnear rd lot",
  "midwest campus eastbound": "midwest campus",
  "midwest campus westbound": "midwest campus",
  "st john east bound": "st john arena",
  "st john arena westbound": "st john arena",
  "ohio union southbound": "ohio union",
  "ohio union northbound": "ohio union",
  "herrick transit hub": "herrick drive transit hub",
  "11th high eastbound": "11th high",
  "11th high westbound": "11th high",
  "15th ave northbound": "15th ave",
  "15th ave southbound": "15th ave",
  "18th ave northbound": "18th ave",
  "18th ave southbound": "18th ave",
  "maynard ave northbound": "maynard ave",
  "maynard ave southbound": "maynard ave",
  "high st 15th ave southbound": "high st 15th ave",
  "buckeye lot": "buckeye lot",
  "fred taylor schottenstein dr": "fred taylor schottenstein dr",
  "service annex": "service annex",
  "stores receiving": "stores receiving",
};

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  result.push(current);
  return result;
}

function normalizeStopName(stopName) {
  if (!stopName) {
    return "unknown-stop";
  }

  const cleaned = stopName
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(eastbound|westbound|northbound|southbound|stop \d+)\b/g, " ")
    .replace(/&/g, " ")
    .replace(/[.+/,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return STOP_ALIASES[cleaned] || cleaned;
}

function getLocalHour(dateLike, timeZone = DEFAULT_TIME_ZONE) {
  const date = dateLike ? new Date(dateLike) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().getHours();
  }

  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(date)
  );
}

function createAggregate() {
  return {
    totalLoad: 0,
    count: 0,
  };
}

function getCrowdLevel(loadRatio) {
  if (loadRatio >= 0.8) {
    return "high";
  }

  if (loadRatio >= 0.5) {
    return "medium";
  }

  return "low";
}

function getComfortScore(loadRatio) {
  if (loadRatio >= 0.8) {
    return 6.2;
  }

  if (loadRatio >= 0.5) {
    return 7.4;
  }

  return 8.6;
}

function createNeutralEstimate() {
  const passengerCount = Math.round(DEFAULT_CAPACITY * 0.55);

  return {
    crowdLevel: "medium",
    passengerCount,
    capacity: DEFAULT_CAPACITY,
    comfortScore: getComfortScore(passengerCount / DEFAULT_CAPACITY),
    isEstimatedCrowding: true,
    crowdSource: "default-estimate",
  };
}

function buildEstimator(csvPath) {
  const byRouteStopHour = new Map();
  const byRouteHour = new Map();

  const csvText = fs.readFileSync(csvPath, "utf8").trim();
  const lines = csvText.split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const routeIndex = headers.indexOf("route");
  const stopIndex = headers.indexOf("bus_stop");
  const loadIndex = headers.indexOf("predicted_bus_load");
  const timeIndex = headers.indexOf("time");

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);

    if (values.length !== headers.length) {
      continue;
    }

    const routeName = values[routeIndex];
    const stopKey = normalizeStopName(values[stopIndex]);
    const load = Number.parseFloat(values[loadIndex]);
    const hour = Number.parseInt(values[timeIndex].split(":")[0], 10);

    if (!routeName || Number.isNaN(load) || Number.isNaN(hour)) {
      continue;
    }

    const routeStopHourKey = `${routeName}::${stopKey}::${hour}`;
    const routeHourKey = `${routeName}::${hour}`;

    const routeStopHour = byRouteStopHour.get(routeStopHourKey) || createAggregate();
    routeStopHour.totalLoad += load;
    routeStopHour.count += 1;
    byRouteStopHour.set(routeStopHourKey, routeStopHour);

    const routeHour = byRouteHour.get(routeHourKey) || createAggregate();
    routeHour.totalLoad += load;
    routeHour.count += 1;
    byRouteHour.set(routeHourKey, routeHour);
  }

  return {
    estimate({ routeName, stopName, dateLike }) {
      if (!routeName) {
        return createNeutralEstimate();
      }

      const hour = getLocalHour(dateLike);
      const normalizedStop = normalizeStopName(stopName);
      const routeStopHour = byRouteStopHour.get(`${routeName}::${normalizedStop}::${hour}`);
      const routeHour = byRouteHour.get(`${routeName}::${hour}`);
      const aggregate = routeStopHour || routeHour;

      if (!aggregate) {
        return createNeutralEstimate();
      }

      const loadRatio = aggregate.totalLoad / aggregate.count;
      const passengerCount = Math.max(0, Math.min(DEFAULT_CAPACITY, Math.round(loadRatio * DEFAULT_CAPACITY)));

      return {
        crowdLevel: getCrowdLevel(loadRatio),
        passengerCount,
        capacity: DEFAULT_CAPACITY,
        comfortScore: getComfortScore(loadRatio),
        isEstimatedCrowding: true,
        crowdSource: routeStopHour ? "csv-route-stop-hour" : "csv-route-hour",
      };
    },
  };
}

const estimator = buildEstimator(
  path.join(__dirname, "..", "public", "osu_cabs_people_traffic_2months.csv")
);

module.exports = {
  createNeutralEstimate,
  normalizeStopName,
  getCrowdLevel,
  getComfortScore,
  estimator,
};
