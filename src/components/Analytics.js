import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { TrendingUp, Users, Clock, BarChart3, Activity } from "lucide-react";
import { useBus } from "../context/BusContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const { buses, stops, routes, roundToSignificantFigures, getRouteColor } = useBus();

  const avgEta =
    buses.length > 0
      ? Math.round(
          buses.reduce((sum, bus) => sum + (bus.etaMinutes ?? 0), 0) / buses.length
        )
      : 0;
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

  const stopCounts = stops
    .map((stop) => ({
      name: stop.name,
      count: buses.filter(
        (bus) =>
          bus.currentStopId === stop.id ||
          bus.nextStops.some((prediction) => prediction.stopId === stop.id)
      ).length,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const etaBuckets = [
    { label: "0-5 min", min: 0, max: 5 },
    { label: "6-10 min", min: 6, max: 10 },
    { label: "11-15 min", min: 11, max: 15 },
    { label: "16+ min", min: 16, max: Infinity },
  ];

  const peakHoursData = {
    labels: etaBuckets.map((bucket) => bucket.label),
    datasets: [
      {
        label: "Live arrivals",
        data: etaBuckets.map((bucket) =>
          buses.filter(
            (bus) =>
              (bus.etaMinutes ?? Infinity) >= bucket.min &&
              (bus.etaMinutes ?? Infinity) <= bucket.max
          ).length
        ),
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.15)",
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const routeDistribution = {
    labels: routes.map((route) => route.code),
    datasets: [
      {
        data: routes.map((route) =>
          buses
            .filter((bus) => bus.routeCode === route.code)
            .reduce((sum, bus) => sum + bus.passengerCount, 0)
        ),
        backgroundColor: routes.map((route) => `${getRouteColor(route.code)}cc`),
        borderColor: routes.map((route) => getRouteColor(route.code)),
        borderWidth: 2,
      },
    ],
  };

  const stopAnalytics = {
    labels: stopCounts.map((stop) => stop.name),
    datasets: [
      {
        label: "Buses serving stop now",
        data: stopCounts.map((stop) => stop.count),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(251, 146, 60, 0.8)",
        ],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  return (
    <div className="analytics-page-buckeyeride">
      <div className="dashboard-top-header">
        <div className="header-content">
          <h1 className="dashboard-title">Transit Analytics</h1>
          <p className="dashboard-subtitle">
            Live OSU arrivals with estimated crowding overlays
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Average ETA</h3>
            <p className="stat-value">{avgEta} min</p>
          </div>
          <div className="stat-icon comfort-icon">
            <Clock size={32} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Estimated Occupancy</h3>
            <p className="stat-value">{avgOccupancy}%</p>
          </div>
          <div className="stat-icon passengers-icon">
            <Users size={32} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3 className="stat-label">Estimated Comfort</h3>
            <p className="stat-value">{avgComfort}/10</p>
          </div>
          <div className="stat-icon comfort-icon">
            <TrendingUp size={32} />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
        }}
      >
        <div className="stat-card" style={{ minHeight: "360px" }}>
          <div className="stat-content" style={{ width: "100%" }}>
            <h3 className="stat-label">Busiest Stops Right Now</h3>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              Based on live vehicle predictions
            </p>
            <div style={{ height: "260px" }}>
              <Bar data={stopAnalytics} options={chartOptions} />
            </div>
          </div>
          <div className="stat-icon bus-icon">
            <BarChart3 size={32} />
          </div>
        </div>

        <div className="stat-card" style={{ minHeight: "360px" }}>
          <div className="stat-content" style={{ width: "100%" }}>
            <h3 className="stat-label">Arrival Distribution</h3>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              Count of buses by next predicted arrival bucket
            </p>
            <div style={{ height: "260px" }}>
              <Line data={peakHoursData} options={chartOptions} />
            </div>
          </div>
          <div className="stat-icon comfort-icon">
            <Activity size={32} />
          </div>
        </div>

        <div className="stat-card" style={{ minHeight: "360px" }}>
          <div className="stat-content" style={{ width: "100%" }}>
            <h3 className="stat-label">Estimated Occupancy by Route</h3>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              Derived from CSV crowd estimates layered on live vehicles
            </p>
            <div style={{ height: "260px" }}>
              <Doughnut data={routeDistribution} options={doughnutOptions} />
            </div>
          </div>
          <div className="stat-icon passengers-icon">
            <Users size={32} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
