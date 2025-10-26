// BusContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import io from "socket.io-client";
import busSimulationService from "../services/busSimulationService";

const BusContext = createContext();

export const useBus = () => {
  const context = useContext(BusContext);
  if (!context) {
    throw new Error("useBus must be used within a BusProvider");
  }
  return context;
};

export const BusProvider = ({ children }) => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [stops, setStops] = useState([]);
  const [simulationStatus, setSimulationStatus] = useState({
    isPlaying: false,
    speed: 1,
    currentTime: null
  });

  useEffect(() => {
    // Initialize simulation service
    initializeSimulation();

    // Initialize socket connection (optional for real-time features)
    const newSocket = io("ws://localhost:3001");
    setSocket(newSocket);

    // Listen for real-time bus updates
    newSocket.on("busUpdate", (busData) => {
      setBuses((prevBuses) =>
        prevBuses.map((bus) =>
          bus.id === busData.id ? { ...bus, ...busData } : bus
        )
      );
    });

    return () => {
      newSocket.close();
      // Clean up simulation listeners
      busSimulationService.removeListener(handleBusUpdate);
    };
  }, []);

  // Initialize the simulation service
  const initializeSimulation = async () => {
    try {
      setLoading(true);
      const success = await busSimulationService.initialize();
      
      if (success) {
        // Get initial data
        const initialBuses = busSimulationService.getAllBuses();
        const initialStops = busSimulationService.getAllStops();
        
        setBuses(initialBuses);
        setStops(initialStops);
        
        // Add listener for bus updates
        busSimulationService.addListener(handleBusUpdate);
        
        // Start simulation
        busSimulationService.startSimulation();
        setSimulationStatus(prev => ({ ...prev, isPlaying: true }));
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error initializing simulation:", error);
      setLoading(false);
    }
  };

  // Handle bus updates from simulation
  const handleBusUpdate = (updatedBuses) => {
    setBuses(updatedBuses);
  };

  // Simulation control functions
  const startSimulation = () => {
    busSimulationService.startSimulation();
    setSimulationStatus(prev => ({ ...prev, isPlaying: true }));
  };

  const pauseSimulation = () => {
    busSimulationService.pauseSimulation();
    setSimulationStatus(prev => ({ ...prev, isPlaying: false }));
  };

  const stopSimulation = () => {
    busSimulationService.stopSimulation();
    setSimulationStatus(prev => ({ ...prev, isPlaying: false }));
  };

  const setSimulationSpeed = (speed) => {
    busSimulationService.setSimulationSpeed(speed);
    setSimulationStatus(prev => ({ ...prev, speed }));
  };

  const updateCrowdLevel = (busId, level) => {
    setBuses((prevBuses) =>
      prevBuses.map((bus) =>
        bus.id === busId ? { ...bus, crowdLevel: level } : bus
      )
    );

    // Send update to server
    if (socket) {
      socket.emit("crowdUpdate", { busId, level });
    }
  };

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
    if (score >= 8) return "#28a745";
    if (score >= 6) return "#ffc107";
    return "#dc3545";
  };

  const getRecommendation = (bus) => {
    const { eta, nextEta, crowdLevel, comfortScore } = bus;
    const timeDifference = nextEta - eta;

    if (crowdLevel === "low" && timeDifference <= 5) {
      return `Recommended: Wait ${timeDifference} more minutes for a less crowded bus`;
    } else if (crowdLevel === "high" && timeDifference <= 3) {
      return `Consider waiting for the next bus (${timeDifference} min later) for better comfort`;
    } else if (comfortScore >= 8) {
      return `Great choice! This bus offers excellent comfort`;
    } else {
      return `Arriving soon - moderate comfort level`;
    }
  };

  const toggleFavoriteStop = (stopId) => {
    setStops(prevStops =>
      prevStops.map(stop =>
        stop.id === stopId ? { ...stop, isFavorite: !stop.isFavorite } : stop
      )
    );
  };

  const getRouteStops = (routeName) => {
    return busSimulationService.getStopsForRoute(routeName);
  };

  // Round to one significant figure
  const roundToSignificantFigures = (num, figures = 1) => {
    if (num === 0) return 0;
    const magnitude = Math.floor(Math.log10(Math.abs(num)));
    const factor = Math.pow(10, figures - 1 - magnitude);
    return Math.round(num * factor) / factor;
  };

  const value = {
    buses,
    loading,
    stops,
    simulationStatus,
    updateCrowdLevel,
    getCrowdEmoji,
    getCrowdText,
    getComfortColor,
    getRecommendation,
    toggleFavoriteStop,
    startSimulation,
    pauseSimulation,
    stopSimulation,
    setSimulationSpeed,
    getRouteStops,
    roundToSignificantFigures,
  };

  return <BusContext.Provider value={value}>{children}</BusContext.Provider>;
  
};
