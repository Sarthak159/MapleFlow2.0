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

  if (allRoutes.length === 0) {
    return null;
  }

  return (
    <div className="route-filter">
      <div className="route-filter-header">
        <div className="route-filter-title">
          <Filter size={16} />
          <span>
            Route Filters
          </span>
          <span className="route-filter-count">
            {selectedRouteCodes.length} of {allRoutes.length} selected
          </span>
        </div>

        <button
          type="button"
          onClick={selectAllRoutes}
          className="route-filter-reset"
        >
          Show all
        </button>
      </div>

      <div className="route-filter-options">
        {allRoutes.map((route) => {
          const isSelected = selectedRouteCodes.includes(route.code);

          return (
            <button
              key={route.code}
              type="button"
              onClick={() => toggleRouteSelection(route.code)}
              className={`route-filter-chip ${isSelected ? "selected" : ""}`}
              style={isSelected ? { "--route-color": getRouteColor(route.code) } : {}}
              aria-pressed={isSelected}
            >
              <span
                className="route-filter-dot"
                style={{ "--route-color": getRouteColor(route.code) }}
              />
              <span>{route.code}</span>
              <span className="route-filter-name">
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
