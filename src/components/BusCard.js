import React from "react";
import { Users, TrendingUp, Bus, Clock, MapPin } from "lucide-react";
import { useBus } from "../context/BusContext";

const BusCard = ({ bus, nextBus, onClick }) => {
  const { roundToSignificantFigures, getRouteColor } = useBus();

  const getCrowdBadgeClass = (level) => {
    switch (level) {
      case "low":
        return "crowd-badge-dashboard low";
      case "medium":
        return "crowd-badge-dashboard medium";
      case "high":
        return "crowd-badge-dashboard high";
      default:
        return "crowd-badge-dashboard low";
    }
  };

  const getCrowdText = (level) => {
    switch (level) {
      case "low":
        return "low";
      case "medium":
        return "medium";
      case "high":
        return "high";
      default:
        return "unknown";
    }
  };

  const capacity = bus.capacity || 50;
  const occupancyPercent = Math.round((bus.passengerCount / capacity) * 100);

  const getOccupancyColor = (percent) => {
    if (percent <= 40) {
      return "#10b981";
    }

    if (percent <= 70) {
      return "#f59e0b";
    }

    return "#ef4444";
  };

  return (
    <button
      type="button"
      className="bus-card-dashboard"
      onClick={() => onClick && onClick(bus)}
      aria-label={`View crowd details for ${bus.routeCode} ${bus.routeName}`}
    >
      <div className="bus-card-dashboard-header">
        <div
          className="bus-route-icon"
          style={{ backgroundColor: getRouteColor(bus.routeCode) }}
        >
          <span style={{ color: "white", fontWeight: 700 }}>{bus.routeCode}</span>
        </div>
        <div className="bus-card-title">
          <h3 className="bus-route-name">{bus.routeName}</h3>
          <p className="bus-route-desc">{bus.destination}</p>
        </div>
        <span className={getCrowdBadgeClass(bus.crowdLevel)}>
          {getCrowdText(bus.crowdLevel)}
        </span>
      </div>

      <div className="bus-card-dashboard-body">
        <div className="bus-metric">
          <Users size={18} className="metric-icon" />
          <span className="metric-label">Occupancy</span>
          <span
            className="metric-value"
            style={{
              color: getOccupancyColor(occupancyPercent),
              fontWeight: "bold",
            }}
          >
            {occupancyPercent}%
          </span>
        </div>

        <div className="bus-metric">
          <TrendingUp size={18} className="metric-icon" />
          <span className="metric-label">Comfort</span>
          <span className="metric-value">
            {roundToSignificantFigures(bus.comfortScore)}/10
          </span>
        </div>

        <div className="bus-metric">
          <Bus size={18} className="metric-icon" />
          <span className="metric-label">Next {bus.routeCode}</span>
          {nextBus ? (
            <span className="metric-value">
              {nextBus.etaMinutes} min
            </span>
          ) : (
            <span className="metric-value">N/A</span>
          )}
        </div>

        <div className="bus-metric">
          <Clock size={18} className="metric-icon" />
          <span className="metric-label">Next Stop</span>
          <span className="metric-value metric-value-primary">
            {bus.etaMinutes ?? "N/A"} {bus.etaMinutes !== null ? "min" : ""}
          </span>
        </div>
      </div>

      <div className="bus-card-dashboard-footer">
        <MapPin size={16} className="footer-icon" />
        <span className="footer-label">
          {bus.currentStopName ? "Currently at" : "En route to"}
        </span>
        <span className="footer-value">
          {(bus.currentStopName || bus.nextStops[0]?.stopName || "Live route").toLowerCase()}
        </span>
      </div>
    </button>
  );
};

export default BusCard;
