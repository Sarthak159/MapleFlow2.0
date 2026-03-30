import React from "react";
import { Check, Filter } from "lucide-react";
import { useBus } from "../context/BusContext";

const RouteFilter = () => {
  const {
    allRoutes,
    selectedRouteCodes,
    toggleRouteSelection,
    selectAllRoutes,
    getRouteColor,
  } = useBus();

  return (
    <div
      style={{
        width: "100%",
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "14px 16px",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} color="#2563eb" />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>
            Route Filters
          </span>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            {selectedRouteCodes.length} of {allRoutes.length} selected
          </span>
        </div>

        <button
          type="button"
          onClick={selectAllRoutes}
          style={{
            border: "none",
            background: "transparent",
            color: "#2563eb",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Show all
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {allRoutes.map((route) => {
          const isSelected = selectedRouteCodes.includes(route.code);

          return (
            <button
              key={route.code}
              type="button"
              onClick={() => toggleRouteSelection(route.code)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "999px",
                border: isSelected ? "1px solid transparent" : "1px solid #d1d5db",
                background: isSelected ? getRouteColor(route.code) : "#f9fafb",
                color: isSelected ? "white" : "#111827",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  background: isSelected ? "rgba(255,255,255,0.9)" : getRouteColor(route.code),
                  flexShrink: 0,
                }}
              />
              <span>{route.code}</span>
              <span style={{ fontSize: "12px", fontWeight: 500, opacity: 0.92 }}>
                {route.name}
              </span>
              {isSelected && <Check size={14} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RouteFilter;
