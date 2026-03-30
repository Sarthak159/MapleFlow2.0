import React, { useMemo, useState } from "react";
import { MapPin, Clock, Bus, Star } from "lucide-react";
import { useBus } from "../context/BusContext";

const FindMyStop = () => {
  const { buses, stops, toggleFavoriteStop, getRouteColor, getCrowdText } = useBus();
  const [selectedStopId, setSelectedStopId] = useState(null);

  const selectedStop = useMemo(
    () => stops.find((stop) => stop.id === selectedStopId) || null,
    [selectedStopId, stops]
  );

  const getBusesForStop = (stopId) => {
    return buses
      .map((bus) => {
        const directPrediction = bus.nextStops.find((stop) => stop.stopId === stopId);

        if (directPrediction) {
          return {
            ...bus,
            etaToStop: directPrediction.etaMinutes,
            arrivalTime: directPrediction.arrivalTime,
          };
        }

        if (bus.currentStopId === stopId) {
          return {
            ...bus,
            etaToStop: 0,
            arrivalTime: bus.updatedAt,
          };
        }

        return null;
      })
      .filter(Boolean)
      .sort((left, right) => left.etaToStop - right.etaToStop);
  };

  const getCrowdBadgeClass = (level) => {
    switch (level) {
      case "low":
        return "crowd-badge-stop low";
      case "medium":
        return "crowd-badge-stop medium";
      case "high":
        return "crowd-badge-stop high";
      default:
        return "crowd-badge-stop low";
    }
  };

  const getExpectedTime = (isoTimestamp, etaMinutes) => {
    if (isoTimestamp) {
      return new Date(isoTimestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    const date = new Date();
    date.setMinutes(date.getMinutes() + etaMinutes);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getOccupancyPercent = (bus) => {
    return Math.round((bus.passengerCount / (bus.capacity || 50)) * 100);
  };

  const getOccupancyGradient = (percent) => {
    if (percent <= 40) {
      return "linear-gradient(90deg, #10b981, #34d399)";
    }

    if (percent <= 70) {
      return "linear-gradient(90deg, #f59e0b, #fbbf24)";
    }

    return "linear-gradient(90deg, #ef4444, #f87171)";
  };

  const getOccupancyColor = (percent) => {
    if (percent <= 40) {
      return "#10b981";
    }

    if (percent <= 70) {
      return "#f59e0b";
    }

    return "#ef4444";
  };

  const getNextBusOfSameRoute = (currentBus, currentStopId) => {
    return getBusesForStop(currentStopId).find(
      (bus) =>
        bus.routeCode === currentBus.routeCode &&
        bus.id !== currentBus.id &&
        bus.etaToStop > currentBus.etaToStop
    );
  };

  if (!selectedStop) {
    return (
      <div className="find-my-stop-page">
        <div className="stop-selection-header">
          <div className="stop-selection-icon">
            <MapPin size={32} />
          </div>
          <div className="stop-selection-title">
            <h1>Select Your Stop</h1>
            <p>Choose from {stops.length} live OSU stops</p>
          </div>
        </div>

        <div className="stops-grid">
          {stops.map((stop) => (
            <div key={stop.id} className="stop-item-wrapper">
              <button
                className={`stop-item-button ${stop.isFavorite ? "favorite" : ""}`}
                onClick={() => setSelectedStopId(stop.id)}
              >
                <MapPin size={20} className="stop-item-icon" />
                <span className="stop-item-name">{stop.name}</span>
              </button>
              <button
                className={`favorite-stop-btn ${stop.isFavorite ? "active" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavoriteStop(stop.id);
                }}
                title={stop.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star
                  size={20}
                  fill={stop.isFavorite ? "#fbbf24" : "none"}
                  stroke={stop.isFavorite ? "#fbbf24" : "#9ca3af"}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const busesAtStop = getBusesForStop(selectedStop.id);

  return (
    <div className="find-my-stop-page">
      <button className="back-to-stops-btn" onClick={() => setSelectedStopId(null)}>
        ← Back to all stops
      </button>

      <div className="selected-stop-header">
        <div className="selected-stop-title-row">
          <div>
            <h1>{selectedStop.name}</h1>
            <p className="buses-arriving-text">
              {busesAtStop.length} {busesAtStop.length === 1 ? "bus" : "buses"} arriving soon
            </p>
          </div>
          <button
            className={`favorite-stop-btn-large ${selectedStop.isFavorite ? "active" : ""}`}
            onClick={() => toggleFavoriteStop(selectedStop.id)}
            title={selectedStop.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              size={28}
              fill={selectedStop.isFavorite ? "#fbbf24" : "none"}
              stroke={selectedStop.isFavorite ? "#fbbf24" : "#9ca3af"}
            />
          </button>
        </div>
      </div>

      <div className="stop-buses-list">
        {busesAtStop.length === 0 ? (
          <div className="no-buses-message">
            <Bus size={48} />
            <p>No buses arriving at this stop soon</p>
            <span>Check back later or select another stop</span>
          </div>
        ) : (
          busesAtStop.map((bus) => {
            const nextBus = getNextBusOfSameRoute(bus, selectedStop.id);
            const currentOccupancy = getOccupancyPercent(bus);

            return (
              <div key={bus.id} className="stop-bus-card">
                <div className="stop-bus-header">
                  <div
                    className="stop-bus-icon"
                    style={{ backgroundColor: getRouteColor(bus.routeCode) }}
                  >
                    <Bus size={24} color="white" />
                  </div>
                  <div className="stop-bus-info">
                    <h3 className="stop-bus-route">{bus.routeCode}</h3>
                    <p className="stop-bus-label">{bus.routeName}</p>
                  </div>
                  <span className={getCrowdBadgeClass(bus.crowdLevel)}>
                    {getCrowdText(bus.crowdLevel).toLowerCase()}
                  </span>
                </div>

                <div className="stop-bus-timing">
                  <div className="timing-row">
                    <div className="timing-item">
                      <Clock size={18} className="timing-icon" />
                      <span className="timing-label">Arriving in</span>
                    </div>
                    <span className="timing-value primary">{bus.etaToStop} min</span>
                  </div>

                  <div className="timing-row">
                    <span className="timing-label">Expected at</span>
                    <span className="timing-value">
                      {getExpectedTime(bus.arrivalTime, bus.etaToStop)}
                    </span>
                  </div>

                  <div className="prediction-confidence">
                    <span className="prediction-label">Estimated Occupancy</span>
                    <span
                      className="prediction-value"
                      style={{
                        color: getOccupancyColor(currentOccupancy),
                        fontWeight: "bold",
                      }}
                    >
                      {currentOccupancy}%
                    </span>
                  </div>
                  <div className="prediction-bar">
                    <div
                      className="prediction-fill"
                      style={{
                        width: `${currentOccupancy}%`,
                        background: getOccupancyGradient(currentOccupancy),
                      }}
                    ></div>
                  </div>

                  {nextBus && (
                    <div className="next-bus-info">
                      <div className="timing-row">
                        <span className="timing-label">Next {bus.routeCode} Bus</span>
                        <span className="timing-value">{nextBus.etaToStop} min</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FindMyStop;
