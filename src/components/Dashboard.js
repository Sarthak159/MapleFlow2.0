import React, { useMemo, useState } from "react";
import { RefreshCw, Users, TrendingUp, Radio } from "lucide-react";
import { useBus } from "../context/BusContext";
import BusCard from "./BusCard";
import MapView from "./MapView";
import CrowdFeedbackModal from "./CrowdFeedbackModal";
import RouteFilter from "./RouteFilter";

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
          <div className="dashboard-filter">
            <RouteFilter />
          </div>
          <div className="live-data-meta" aria-live="polite">
            <span className="live-data-source">
              <Radio size={14} /> {dataSource}
            </span>
            <span>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "N/A"}</span>
            {isStale && <span className="status-warning">Showing cached data</span>}
            {error && <span className="status-error">{error}</span>}
          </div>
        </div>
        <button
          type="button"
          className="refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? "animate-spin" : ""} size={20} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-blue">
          <div className="stat-content">
            <h3 className="stat-label">Active Buses</h3>
            <p className="stat-value">{activeBuses}</p>
          </div>
          <div className="stat-icon bus-icon">
            <Users size={32} />
          </div>
        </div>

        <div className="stat-card stat-card-pink">
          <div className="stat-content">
            <h3 className="stat-label">Avg. Occupancy</h3>
            <p className="stat-value">{avgOccupancy}%</p>
            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Estimated</p>
          </div>
          <div className="stat-icon passengers-icon">
            <Users size={32} />
          </div>
        </div>

        <div className="stat-card stat-card-green">
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

      <section className="dashboard-map-section" aria-label="Live bus map">
        <MapView />
      </section>

      <section className="bus-list-section" aria-labelledby="live-vehicles-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Live fleet</p>
            <h2 id="live-vehicles-heading">Vehicles in service</h2>
          </div>
          <span className="result-count">{sortedBuses.length} buses</span>
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
      </section>

      {selectedBus && (
        <CrowdFeedbackModal bus={selectedBus} onClose={() => setSelectedBus(null)} />
      )}
    </div>
  );
};

export default Dashboard;
