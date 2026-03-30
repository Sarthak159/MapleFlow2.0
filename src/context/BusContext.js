import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchOsuBusSnapshot } from "../services/osuBusApi";

const BusContext = createContext();
const POLL_INTERVAL_MS = 20000;
const FAVORITES_STORAGE_KEY = "mapleflow.favoriteStops";
const CROWD_OVERRIDE_STORAGE_KEY = "mapleflow.crowdOverrides";
const SELECTED_ROUTES_STORAGE_KEY = "mapleflow.selectedRoutes";

function readJsonStorage(key, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function getComfortScoreForLevel(level) {
  switch (level) {
    case "low":
      return 8.6;
    case "medium":
      return 7.4;
    case "high":
      return 6.2;
    default:
      return 7.4;
  }
}

function getPassengerCountForLevel(level, capacity) {
  switch (level) {
    case "low":
      return Math.round(capacity * 0.35);
    case "medium":
      return Math.round(capacity * 0.6);
    case "high":
      return Math.round(capacity * 0.9);
    default:
      return Math.round(capacity * 0.6);
  }
}

function applyCrowdOverride(bus, override) {
  if (!override) {
    return bus;
  }

  const capacity = bus.capacity || 50;

  return {
    ...bus,
    crowdLevel: override.crowdLevel,
    passengerCount: getPassengerCountForLevel(override.crowdLevel, capacity),
    comfortScore: getComfortScoreForLevel(override.crowdLevel),
    crowdSource: "user-feedback",
    isEstimatedCrowding: true,
  };
}

function decorateSnapshot(snapshot, favoriteStopIds, crowdOverrides) {
  const favoriteIds = new Set(favoriteStopIds);

  return {
    ...snapshot,
    stops: snapshot.stops.map((stop) => ({
      ...stop,
      isFavorite: favoriteIds.has(stop.id),
    })),
    vehicles: snapshot.vehicles.map((vehicle) => {
      const bus = {
        ...vehicle,
        currentStop: vehicle.currentStopName,
      };
      return applyCrowdOverride(bus, crowdOverrides[vehicle.id]);
    }),
  };
}

export const useBus = () => {
  const context = useContext(BusContext);

  if (!context) {
    throw new Error("useBus must be used within a BusProvider");
  }

  return context;
};

export const BusProvider = ({ children }) => {
  const [allBuses, setAllBuses] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [dataSource, setDataSource] = useState("OSU Bus API");
  const [favoriteStopIds, setFavoriteStopIds] = useState(() =>
    readJsonStorage(FAVORITES_STORAGE_KEY, [])
  );
  const [crowdOverrides, setCrowdOverrides] = useState(() =>
    readJsonStorage(CROWD_OVERRIDE_STORAGE_KEY, {})
  );
  const [selectedRouteCodes, setSelectedRouteCodes] = useState(() =>
    readJsonStorage(SELECTED_ROUTES_STORAGE_KEY, [])
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favoriteStopIds)
    );
    return undefined;
  }, [favoriteStopIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.localStorage.setItem(
      CROWD_OVERRIDE_STORAGE_KEY,
      JSON.stringify(crowdOverrides)
    );
    return undefined;
  }, [crowdOverrides]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.localStorage.setItem(
      SELECTED_ROUTES_STORAGE_KEY,
      JSON.stringify(selectedRouteCodes)
    );
    return undefined;
  }, [selectedRouteCodes]);

  const refreshData = useCallback(async () => {
    const controller = new AbortController();

    try {
      setError(null);
      const snapshot = await fetchOsuBusSnapshot(controller.signal);
      const decoratedSnapshot = decorateSnapshot(
        snapshot,
        favoriteStopIds,
        crowdOverrides
      );

      setAllRoutes(decoratedSnapshot.routes);
      setAllStops(decoratedSnapshot.stops);
      setAllBuses(decoratedSnapshot.vehicles);
      setSelectedRouteCodes((previousCodes) => {
        if (previousCodes.length === 0) {
          return decoratedSnapshot.routes.map((route) => route.code);
        }

        const availableCodes = new Set(
          decoratedSnapshot.routes.map((route) => route.code)
        );
        const nextCodes = previousCodes.filter((code) => availableCodes.has(code));

        return nextCodes.length > 0
          ? nextCodes
          : decoratedSnapshot.routes.map((route) => route.code);
      });
      setLastUpdated(decoratedSnapshot.generatedAt);
      setIsStale(Boolean(decoratedSnapshot.stale));
      setDataSource(decoratedSnapshot.dataSource || "OSU Bus API");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [crowdOverrides, favoriteStopIds]);

  useEffect(() => {
    refreshData();
    const intervalId = window.setInterval(() => {
      refreshData();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshData]);

  const toggleFavoriteStop = useCallback((stopId) => {
    setFavoriteStopIds((previousIds) => {
      const nextIds = previousIds.includes(stopId)
        ? previousIds.filter((id) => id !== stopId)
        : [...previousIds, stopId];

      setAllStops((previousStops) =>
        previousStops.map((stop) =>
          stop.id === stopId
            ? { ...stop, isFavorite: !stop.isFavorite }
            : stop
        )
      );

      return nextIds;
    });
  }, []);

  const updateCrowdLevel = useCallback((busId, crowdLevel) => {
    setCrowdOverrides((previousOverrides) => ({
      ...previousOverrides,
      [busId]: { crowdLevel },
    }));

    setAllBuses((previousBuses) =>
      previousBuses.map((bus) =>
        bus.id === busId
          ? applyCrowdOverride(bus, { crowdLevel })
          : bus
      )
    );
  }, []);

  const getCrowdEmoji = (level) => {
    switch (level) {
      case "low":
        return "🟢";
      case "medium":
        return "🟡";
      case "high":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const getCrowdText = (level) => {
    switch (level) {
      case "low":
        return "Low";
      case "medium":
        return "Medium";
      case "high":
        return "High";
      default:
        return "Unknown";
    }
  };

  const getComfortColor = (score) => {
    if (score >= 8) {
      return "#28a745";
    }

    if (score >= 6) {
      return "#ffc107";
    }

    return "#dc3545";
  };

  const getRecommendation = (bus) => {
    const eta = bus.etaMinutes ?? bus.eta;
    const nextRouteBus = allBuses
      .filter(
        (candidate) =>
          candidate.routeCode === bus.routeCode &&
          candidate.id !== bus.id &&
          (candidate.etaMinutes ?? candidate.eta) !== null &&
          (candidate.etaMinutes ?? candidate.eta) > eta
      )
      .sort(
        (left, right) =>
          (left.etaMinutes ?? left.eta) - (right.etaMinutes ?? right.eta)
      )[0];

    if (bus.crowdLevel === "high" && nextRouteBus) {
      return `Crowded now. Next ${bus.routeCode} arrives in ${nextRouteBus.etaMinutes ?? nextRouteBus.eta} min.`;
    }

    if (bus.crowdLevel === "low") {
      return "Low estimated crowding on this bus.";
    }

    if (eta === null || eta === undefined) {
      return "Live vehicle detected, but arrival time is not currently available.";
    }

      return `Estimated arrival in ${eta} min.`;
  };

  const getRouteStops = useCallback(
    (routeCode) => allRoutes.find((route) => route.code === routeCode)?.stops || [],
    [allRoutes]
  );

  const getRouteColor = useCallback(
    (routeCode) =>
      allRoutes.find((route) => route.code === routeCode)?.color || "#6366f1",
    [allRoutes]
  );

  const toggleRouteSelection = useCallback((routeCode) => {
    setSelectedRouteCodes((previousCodes) => {
      const isSelected = previousCodes.includes(routeCode);

      if (isSelected && previousCodes.length === 1) {
        return previousCodes;
      }

      return isSelected
        ? previousCodes.filter((code) => code !== routeCode)
        : [...previousCodes, routeCode];
    });
  }, []);

  const selectAllRoutes = useCallback(() => {
    setSelectedRouteCodes(allRoutes.map((route) => route.code));
  }, [allRoutes]);

  const showOnlyRoute = useCallback((routeCode) => {
    setSelectedRouteCodes([routeCode]);
  }, []);

  const clearRouteSelection = useCallback(() => {
    if (allRoutes.length > 0) {
      setSelectedRouteCodes([allRoutes[0].code]);
    }
  }, [allRoutes]);

  const selectedRouteCodeSet = useMemo(
    () => new Set(selectedRouteCodes),
    [selectedRouteCodes]
  );

  const routes = useMemo(
    () =>
      allRoutes.filter((route) => selectedRouteCodeSet.has(route.code)),
    [allRoutes, selectedRouteCodeSet]
  );

  const buses = useMemo(
    () =>
      allBuses.filter((bus) => selectedRouteCodeSet.has(bus.routeCode)),
    [allBuses, selectedRouteCodeSet]
  );

  const stops = useMemo(
    () =>
      allStops.filter((stop) =>
        stop.routeCodes.some((routeCode) => selectedRouteCodeSet.has(routeCode))
      ),
    [allStops, selectedRouteCodeSet]
  );

  const roundToSignificantFigures = (value, figures = 1) => {
    if (!value) {
      return 0;
    }

    const magnitude = Math.floor(Math.log10(Math.abs(value)));
    const factor = 10 ** (figures - 1 - magnitude);
    return Math.round(value * factor) / factor;
  };

  const value = {
    buses,
    allBuses,
    routes,
    allRoutes,
    stops,
    allStops,
    loading,
    error,
    lastUpdated,
    isStale,
    dataSource,
    updateCrowdLevel,
    refreshData,
    getCrowdEmoji,
    getCrowdText,
    getComfortColor,
    getRecommendation,
    toggleFavoriteStop,
    getRouteStops,
    getRouteColor,
    selectedRouteCodes,
    toggleRouteSelection,
    selectAllRoutes,
    showOnlyRoute,
    clearRouteSelection,
    roundToSignificantFigures,
  };

  return <BusContext.Provider value={value}>{children}</BusContext.Provider>;
};
