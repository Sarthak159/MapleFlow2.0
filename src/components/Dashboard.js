import React, { useMemo, useState } from "react";
import { RefreshCw, Users, TrendingUp, Radio } from "lucide-react";
import { useBus } from "../context/BusContext";
import BusCard from "./BusCard";
import MapView from "./MapView";
import CrowdFeedbackModal from "./CrowdFeedbackModal";

const Dashboard = () => {
  const {
    buses,
    loading,
    error,
    refreshData,
    lastUpdated,
    isStale,
    dataSource,
    roundToSignificantFigures,
  } = useBus();
  const [selectedBus, setSelectedBus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const sortedBuses = useMemo(
    () =>
      [...buses].sort((left, right) => {
        const leftEta = left.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        const rightEta = right.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        return leftEta - rightEta;
      }),
    [buses]
  );

  const handleBusClick = (bus) => {
    setSelectedBus(bus);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const getNextBusInfo = (currentBus) => {
    return sortedBuses.find(
      (bus) =>
        bus.routeCode === currentBus.routeCode &&
        bus.id !== currentBus.id &&
        (bus.etaMinutes ?? Number.MAX_SAFE_INTEGER) >
          (currentBus.etaMinutes ?? Number.MAX_SAFE_INTEGER)
    );
  };

  const activeBuses = buses.length;
  const avgOccupancy =
    buses.length > 0
      ? Math.round(
          buses.reduce(
            (sum, bus) => sum + (bus.passengerCount / (bus.capacity || 50)) * 100,
            0
          ) / buses.length
        )
      : 0;
  const avgComfort =
    buses.length > 0
      ? roundToSignificantFigures(
          buses.reduce((sum, bus) => sum + bus.comfortScore, 0) / buses.length
        )
      : 0;

  if (loading) {
    return (
      <div className="dashboard-buckeyeride">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading live OSU buses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-buckeyeride">
      <div className="dashboard-top-header">
        <div className="header-content">
          <h1 className="dashboard-title">Live OSU Bus Data</h1>
          <p className="dashboard-subtitle">
            Real-time arrivals and stop locations with estimated crowding
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "12px",
              fontSize: "13px",
              color: "#4b5563",
            }}
          >
            <span>
              <Radio size={14} style={{ verticalAlign: "text-bottom" }} /> {dataSource}
            </span>
            <span>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "N/A"}</span>
            {isStale && <span style={{ color: "#b45309" }}>Showing cached data</span>}
            {error && <span style={{ color: "#b91c1c" }}>{error}</span>}
          </div>
        </div>
        <button
          className="refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? "animate-spin" : ""} size={20} />
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Active Buses</h3>
            <p className="stat-value">{activeBuses}</p>
          </div>
          <div className="stat-icon bus-icon">
            <Users size={32} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Avg. Occupancy</h3>
            <p className="stat-value">{avgOccupancy}%</p>
            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Estimated</p>
          </div>
          <div className="stat-icon passengers-icon">
            <Users size={32} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Avg Comfort</h3>
            <p className="stat-value">{avgComfort}/10</p>
            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Estimated</p>
          </div>
          <div className="stat-icon comfort-icon">
            <TrendingUp size={32} />
          </div>
        </div>
      </div>

      <div className="dashboard-map-section">
        <MapView />
      </div>

      <div className="bus-cards-grid">
        {sortedBuses.map((bus) => (
          <BusCard
            key={bus.id}
            bus={bus}
            nextBus={getNextBusInfo(bus)}
            onClick={handleBusClick}
          />
        ))}
      </div>

      {selectedBus && (
        <CrowdFeedbackModal bus={selectedBus} onClose={() => setSelectedBus(null)} />
      )}
    </div>
  );
};

export default Dashboard;
