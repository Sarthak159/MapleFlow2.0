import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useBus } from '../context/BusContext';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom bus marker icons based on crowd level
const createBusIcon = (route, crowdLevel) => {
  const colorMap = {
    low: '#10b981',    // green
    medium: '#f59e0b', // yellow
    high: '#ef4444'    // red
  };
  
  const color = colorMap[crowdLevel] || '#6366f1';
  
  return L.divIcon({
    className: 'custom-bus-marker',
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
        ${route}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Custom stop marker icon
const createStopIcon = () => {
  return L.divIcon({
    className: 'custom-stop-marker',
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
        font-weight: bold;
        font-size: 12px;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        🚏
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Component to auto-fit bounds (only on initial load)
const MapBounds = ({ buses, isInitialLoad }) => {
  const map = useMap();
  
  useEffect(() => {
    if (isInitialLoad && buses && buses.length > 0) {
      const bounds = buses.map(bus => [bus.location.lat, bus.location.lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [buses, map, isInitialLoad]);
  
  return null;
};

// Component for map controls
const MapControls = () => {
  const map = useMap();
  
  const handleFullscreen = () => {
    if (map.getContainer().requestFullscreen) {
      map.getContainer().requestFullscreen();
    }
  };
  
  const handleResetView = () => {
    map.setView([40.0020, -83.0200], 14);
  };
  
  return (
    <div className="map-controls">
      <button 
        className="map-control-btn" 
        onClick={handleResetView}
        title="Reset View"
      >
        🏠
      </button>
      <button 
        className="map-control-btn" 
        onClick={handleFullscreen}
        title="Fullscreen"
      >
        ⛶
      </button>
    </div>
  );
};

// Component for route visualization
const RouteVisualization = ({ buses, stops, getRouteStops }) => {
  const routes = {};
  
  // Group buses by route and get their stops
  buses.forEach(bus => {
    if (!routes[bus.route]) {
      // Get stops for this specific route
      const routeStops = getRouteStops ? getRouteStops(bus.route) : [];
      
      routes[bus.route] = {
        buses: [],
        stops: routeStops
      };
    }
    routes[bus.route].buses.push(bus);
  });
  
  return (
    <>
      {Object.entries(routes).map(([routeName, routeData]) => {
        if (routeData.stops.length < 2) return null;
        
        // Create route path by connecting stops in order
        const positions = routeData.stops.map(stop => [stop.location.lat, stop.location.lng]);
        
        return (
          <Polyline
            key={routeName}
            positions={positions}
            color={getRouteColor(routeName)}
            weight={4}
            opacity={0.7}
            dashArray="10, 10"
          />
        );
      })}
    </>
  );
};

// Get color for route
const getRouteColor = (routeName) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const hash = routeName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
};

const MapView = () => {
  const { buses, stops, getCrowdEmoji, getCrowdText, getComfortColor, getRecommendation, getRouteStops, roundToSignificantFigures } = useBus();
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [filteredBuses, setFilteredBuses] = useState([]);
  const [filteredStops, setFilteredStops] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Default center (Columbus, OH area)
  const defaultCenter = [40.0020, -83.0200];
  
  // Filter buses and stops based on selection
  useEffect(() => {
    setFilteredBuses(buses);
    setFilteredStops(stops || []);
    
    // Mark initial load as complete after first data load
    if (buses.length > 0 && isInitialLoad) {
      setTimeout(() => setIsInitialLoad(false), 1000);
    }
  }, [buses, stops, isInitialLoad]);
  
  // Handle bus marker click
  const handleBusClick = useCallback((bus) => {
    setSelectedBus(bus);
    setSelectedStop(null);
  }, []);
  
  // Handle stop marker click
  const handleStopClick = useCallback((stop) => {
    setSelectedStop(stop);
    setSelectedBus(null);
  }, []);
  
  // Enhanced bus popup content
  const BusPopup = ({ bus }) => (
    <div style={{ textAlign: 'center', minWidth: '200px', padding: '8px' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1f2937' }}>
        {bus.route} - {bus.destination}
      </h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
        <div>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
            {bus.eta} min
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>ETA</p>
        </div>
        <div>
          <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>
            {getCrowdEmoji(bus.crowdLevel)} {getCrowdText(bus.crowdLevel)}
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>Crowding</p>
        </div>
      </div>
      <div style={{ margin: '8px 0', padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
        <p style={{ margin: '0', fontSize: '14px', color: '#374151' }}>
          <strong>Comfort:</strong> {roundToSignificantFigures(bus.comfortScore)}/10
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#374151' }}>
          <strong>Passengers:</strong> {bus.passengerCount}/{bus.capacity}
        </p>
        {bus.isEcoMode && (
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#10b981' }}>
            🌱 Eco Mode - {bus.co2Saved}kg CO₂ saved
          </p>
        )}
      </div>
      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
        {getRecommendation(bus)}
      </p>
    </div>
  );
  
  // Enhanced stop popup content
  const StopPopup = ({ stop }) => (
    <div style={{ textAlign: 'center', minWidth: '150px', padding: '8px' }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1f2937' }}>
        {stop.name}
        {stop.isFavorite && <span style={{ marginLeft: '4px' }}>⭐</span>}
      </h4>
      <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
        Bus Stop
      </p>
      <div style={{ margin: '8px 0', padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
        <p style={{ margin: '0', fontSize: '12px', color: '#374151' }}>
          Click to see buses at this stop
        </p>
      </div>
    </div>
  );
  
  return (
    <div className="map-container" style={{ position: 'relative' }}>
      {/* Map Legend */}
      <div className="map-legend" style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        fontSize: '12px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Legend</h4>
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%', marginRight: '8px' }}></div>
          <span>Low Crowding</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '50%', marginRight: '8px' }}></div>
          <span>Medium Crowding</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%', marginRight: '8px' }}></div>
          <span>High Crowding</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: '#374151', borderRadius: '50%', marginRight: '8px' }}></div>
          <span>Bus Stops</span>
        </div>
        <button 
          onClick={() => setShowRoutes(!showRoutes)}
          style={{
            marginTop: '8px',
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: showRoutes ? '#3b82f6' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showRoutes ? 'Hide' : 'Show'} Routes
        </button>
      </div>
      
      <MapContainer
        center={defaultCenter}
        zoom={14}
        style={{ height: '100%', width: '100%', borderRadius: '0' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBounds buses={buses} isInitialLoad={isInitialLoad} />
        <MapControls />
        
        {/* Route Visualization */}
        {showRoutes && <RouteVisualization buses={buses} stops={stops} getRouteStops={getRouteStops} />}
        
        {/* Bus Markers with enhanced interactivity */}
        {filteredBuses.map((bus) => (
          <Marker
            key={bus.id}
            position={[bus.location.lat, bus.location.lng]}
            icon={createBusIcon(bus.route, bus.crowdLevel)}
            eventHandlers={{
              click: () => handleBusClick(bus),
            }}
          >
            <Popup closeButton={true} autoClose={false}>
              <BusPopup bus={bus} />
            </Popup>
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div style={{ textAlign: 'center' }}>
                <strong>{bus.route}</strong><br/>
                {bus.eta} min • {getCrowdText(bus.crowdLevel)}
              </div>
            </Tooltip>
          </Marker>
        ))}
        
        {/* Stop Markers with enhanced interactivity */}
        {filteredStops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.location.lat, stop.location.lng]}
            icon={createStopIcon()}
            eventHandlers={{
              click: () => handleStopClick(stop),
            }}
          >
            <Popup closeButton={true} autoClose={false}>
              <StopPopup stop={stop} />
            </Popup>
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div style={{ textAlign: 'center' }}>
                <strong>{stop.name}</strong><br/>
                Bus Stop
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;

