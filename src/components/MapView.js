import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useBus } from "../context/BusContext";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const createBusIcon = (routeCode, color) =>
  L.divIcon({
    className: "custom-bus-marker",
    html: `
      <div style="
        background: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${routeCode}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const createStopIcon = () =>
  L.divIcon({
    className: "custom-stop-marker",
    html: `
      <div style="
        background: #374151;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        🚏
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const MapBounds = ({ buses, stops, isInitialLoad }) => {
  const map = useMap();

  useEffect(() => {
    if (!isInitialLoad) {
      return;
    }

    const coordinates = [
      ...buses.map((bus) => [bus.location.lat, bus.location.lng]),
      ...stops.map((stop) => [stop.location.lat, stop.location.lng]),
    ];

    if (coordinates.length > 0) {
      map.fitBounds(coordinates, { padding: [40, 40] });
    }
  }, [buses, stops, map, isInitialLoad]);

  return null;
};

const MapView = () => {
  const {
    buses,
    routes,
    stops,
    getCrowdEmoji,
    getCrowdText,
    getRecommendation,
    roundToSignificantFigures,
    getRouteColor,
  } = useBus();
  const [showRoutes, setShowRoutes] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (buses.length > 0 || stops.length > 0) {
      const timeoutId = window.setTimeout(() => setIsInitialLoad(false), 800);
      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [buses.length, stops.length]);

  return (
    <div className="map-container" style={{ position: "relative" }}>
      <div
        className="map-legend"
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "white",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          zIndex: 1000,
          fontSize: "12px",
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Legend</h4>
        <div style={{ marginBottom: "6px" }}>Route colors and live stop markers</div>
        <button
          onClick={() => setShowRoutes((currentValue) => !currentValue)}
          style={{
            marginTop: "8px",
            padding: "4px 8px",
            fontSize: "12px",
            backgroundColor: showRoutes ? "#3b82f6" : "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {showRoutes ? "Hide" : "Show"} Routes
        </button>
      </div>

      <MapContainer
        center={[40.002, -83.02]}
        zoom={14}
        style={{ height: "100%", width: "100%", borderRadius: "0" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBounds buses={buses} stops={stops} isInitialLoad={isInitialLoad} />

        {showRoutes &&
          routes.map((route) =>
            route.paths.map((path) => (
              <Polyline
                key={`${route.code}-${path.id}`}
                positions={path.points.map((point) => [point.lat, point.lng])}
                color={route.color}
                weight={4}
                opacity={0.75}
              />
            ))
          )}

        {stops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.location.lat, stop.location.lng]}
            icon={createStopIcon()}
          >
            <Popup>
              <div style={{ minWidth: "180px" }}>
                <h4 style={{ margin: "0 0 6px 0" }}>{stop.name}</h4>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                  Routes: {stop.routeCodes.join(", ")}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {buses.map((bus) => (
          <Marker
            key={bus.id}
            position={[bus.location.lat, bus.location.lng]}
            icon={createBusIcon(bus.routeCode, getRouteColor(bus.routeCode))}
          >
            <Popup>
              <div style={{ minWidth: "210px" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>
                  {bus.routeCode} · {bus.routeName}
                </h3>
                <div style={{ display: "grid", gap: "6px", fontSize: "14px" }}>
                  <div>
                    <strong>Destination:</strong> {bus.destination}
                  </div>
                  <div>
                    <strong>ETA:</strong> {bus.etaMinutes ?? "N/A"} min
                  </div>
                  <div>
                    <strong>Crowding:</strong> {getCrowdEmoji(bus.crowdLevel)}{" "}
                    {getCrowdText(bus.crowdLevel)} (estimated)
                  </div>
                  <div>
                    <strong>Comfort:</strong> {roundToSignificantFigures(bus.comfortScore)}/10
                  </div>
                  <div>
                    <strong>Status:</strong>{" "}
                    {bus.currentStopName
                      ? `At ${bus.currentStopName}`
                      : `En route to ${bus.nextStops[0]?.stopName || "next stop"}`}
                  </div>
                </div>
                {bus.nextStops.length > 0 && (
                  <div style={{ marginTop: "10px", fontSize: "13px" }}>
                    <strong>Upcoming:</strong>
                    <div>{bus.nextStops.map((stop) => `${stop.stopName} (${stop.etaMinutes} min)`).join(", ")}</div>
                  </div>
                )}
                <p
                  style={{
                    margin: "10px 0 0 0",
                    fontSize: "12px",
                    color: "#6b7280",
                    fontStyle: "italic",
                  }}
                >
                  {getRecommendation(bus)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
