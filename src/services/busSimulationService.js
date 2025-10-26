// Bus Simulation Service using CSV data
import csvDataService from './csvDataService';

class BusSimulationService {
  constructor() {
    this.buses = new Map();
    this.stops = new Map();
    this.routes = new Map();
    this.isInitialized = false;
    this.listeners = [];
  }

  // Initialize the simulation with CSV data
  async initialize() {
    try {
      await csvDataService.loadCSVData();
      this.setupStops();
      this.setupRoutes();
      this.createBuses();
      this.isInitialized = true;
      
      // Start listening to CSV data changes
      csvDataService.addListener(this.updateBuses.bind(this));
      
      console.log('Bus simulation initialized');
      return true;
    } catch (error) {
      console.error('Error initializing bus simulation:', error);
      return false;
    }
  }

  // Setup stops from CSV data
  setupStops() {
    const uniqueStops = csvDataService.getUniqueStops();
    
    // Default stop locations (you can expand this)
    const stopLocations = {
      'Arps Hall (NB)': { lat: 40.0050, lng: -83.0300 },
      '11th & Worthington (EB)': { lat: 40.0065, lng: -83.0285 },
      'Blackburn House (WB)': { lat: 40.0020, lng: -83.0180 },
      'Brain and Spine Hospital': { lat: 40.0000, lng: -83.0100 },
      'Gray': { lat: 39.9995, lng: -83.0145 },
      'Herrick Drive Transit Hub (NB)': { lat: 40.0030, lng: -83.0220 },
      'Mack Hall (NB)': { lat: 40.0045, lng: -83.0255 },
      'Mason Hall (WB)': { lat: 40.0010, lng: -83.0165 },
      'Ohio Union (NB)': { lat: 40.0025, lng: -83.0195 },
      'Ohio Union (SB)': { lat: 40.0025, lng: -83.0195 },
      'Ross Heart Hospital': { lat: 39.9985, lng: -83.0125 },
      'Scarlet': { lat: 40.0055, lng: -83.0275 },
      'Siebert Hall (WB)': { lat: 40.0040, lng: -83.0240 },
      'St. John Arena (EB)': { lat: 40.0070, lng: -83.0310 },
      'The James Cancer Hospital': { lat: 39.9980, lng: -83.0110 },
      'University Hospital': { lat: 39.9975, lng: -83.0095 }
    };

    uniqueStops.forEach(stopName => {
      const location = stopLocations[stopName] || { lat: 40.0000, lng: -83.0200 };
      this.stops.set(stopName, {
        id: csvDataService.mapStopNameToId(stopName),
        name: stopName,
        location,
        isFavorite: false
      });
    });
  }

  // Setup routes from CSV data
  setupRoutes() {
    const uniqueRoutes = csvDataService.getUniqueRoutes();
    
    uniqueRoutes.forEach(route => {
      this.routes.set(route, {
        name: route,
        stops: this.getStopsForRoute(route),
        buses: []
      });
    });
  }

  // Get stops for a specific route
  getStopsForRoute(route) {
    const routeData = csvDataService.getDataForRoute(route);
    const uniqueStops = [...new Set(routeData.map(record => record.bus_stop))];
    return uniqueStops.map(stopName => this.stops.get(stopName)).filter(Boolean);
  }

  // Create buses based on CSV data
  createBuses() {
    const routes = csvDataService.getUniqueRoutes();
    
    routes.forEach(route => {
      // Create 2-3 buses per route
      const busCount = Math.min(3, Math.max(2, Math.floor(Math.random() * 2) + 2));
      
      for (let i = 0; i < busCount; i++) {
        const busId = `${route}-${1000 + i}`;
        const bus = this.createBus(busId, route);
        this.buses.set(busId, bus);
        
        // Add bus to route
        if (this.routes.has(route)) {
          this.routes.get(route).buses.push(busId);
        }
      }
    });
  }

  // Create a single bus
  createBus(id, route) {
    const routeStops = this.getStopsForRoute(route);
    const currentStop = routeStops[Math.floor(Math.random() * routeStops.length)];
    
    return {
      id,
      route,
      destination: route,
      eta: Math.floor(Math.random() * 15) + 1,
      nextEta: Math.floor(Math.random() * 15) + 16,
      crowdLevel: 'medium',
      comfortScore: 7.5,
      temperature: 70 + Math.floor(Math.random() * 10),
      smoothness: 7 + Math.floor(Math.random() * 3),
      passengerCount: Math.floor(Math.random() * 50),
      capacity: 50,
      isEcoMode: Math.random() > 0.5,
      co2Saved: Math.floor(Math.random() * 25),
      location: currentStop ? currentStop.location : { lat: 40.0000, lng: -83.0200 },
      heading: Math.floor(Math.random() * 360),
      currentStop: currentStop ? currentStop.name : 'Unknown',
      nextStops: this.generateNextStops(routeStops, currentStop),
      lastUpdate: Date.now()
    };
  }

  // Generate next stops for a bus
  generateNextStops(routeStops, currentStop) {
    if (!currentStop || routeStops.length < 2) return [];
    
    const currentIndex = routeStops.findIndex(stop => stop.name === currentStop.name);
    const nextStops = [];
    
    for (let i = 1; i <= 3; i++) {
      const nextIndex = (currentIndex + i) % routeStops.length;
      const nextStop = routeStops[nextIndex];
      if (nextStop) {
        nextStops.push({
          name: nextStop.name,
          eta: i * 3 + Math.floor(Math.random() * 5)
        });
      }
    }
    
    return nextStops;
  }

  // Update buses based on CSV data
  updateBuses(csvRecord) {
    if (!csvRecord) return;

    // Find buses that should be at this stop
    const relevantBuses = this.findBusesAtStop(csvRecord.bus_stop, csvRecord.route);
    
    relevantBuses.forEach(busId => {
      const bus = this.buses.get(busId);
      if (bus) {
        this.updateBusFromCSV(bus, csvRecord);
      }
    });

    // Update all buses' positions and ETAs
    this.updateAllBuses();
    
    // Notify listeners
    this.notifyListeners();
  }

  // Find buses that should be at a specific stop
  findBusesAtStop(stopName, route) {
    const buses = [];
    
    this.buses.forEach((bus, busId) => {
      if (bus.route === route && bus.currentStop === stopName) {
        buses.push(busId);
      }
    });
    
    return buses;
  }

  // Update a specific bus from CSV data
  updateBusFromCSV(bus, csvRecord) {
    // Update crowd level based on predicted bus load
    const load = parseFloat(csvRecord.predicted_bus_load);
    if (load >= 0.8) {
      bus.crowdLevel = 'high';
    } else if (load >= 0.5) {
      bus.crowdLevel = 'medium';
    } else {
      bus.crowdLevel = 'low';
    }

    // Update passenger count based on load
    bus.passengerCount = Math.floor(load * bus.capacity);
    
    // Update comfort score based on crowd level
    if (bus.crowdLevel === 'high') {
      bus.comfortScore = 6 + Math.random() * 2;
    } else if (bus.crowdLevel === 'medium') {
      bus.comfortScore = 7 + Math.random() * 2;
    } else {
      bus.comfortScore = 8 + Math.random() * 2;
    }

    // Update ETA based on wait time
    const waitTime = parseFloat(csvRecord.wait_time_min);
    bus.eta = Math.max(1, Math.floor(waitTime));
    bus.nextEta = bus.eta + 5 + Math.floor(Math.random() * 10);

    bus.lastUpdate = Date.now();
  }

  // Update all buses' positions and status
  updateAllBuses() {
    this.buses.forEach((bus, busId) => {
      // Simulate bus movement
      this.simulateBusMovement(bus);
      
      // Update eco mode randomly
      if (Math.random() < 0.1) { // 10% chance to toggle eco mode
        bus.isEcoMode = !bus.isEcoMode;
        bus.co2Saved = bus.isEcoMode ? Math.floor(Math.random() * 25) : 0;
      }
      
      // Update temperature slightly
      bus.temperature += (Math.random() - 0.5) * 2;
      bus.temperature = Math.max(65, Math.min(80, bus.temperature));
      
      // Update smoothness
      bus.smoothness += (Math.random() - 0.5) * 0.5;
      bus.smoothness = Math.max(5, Math.min(10, bus.smoothness));
    });
  }

  // Simulate bus movement
  simulateBusMovement(bus) {
    // Simple movement simulation - in a real app, this would be more sophisticated
    const movementSpeed = 0.0001; // degrees per update
    const angle = (bus.heading * Math.PI) / 180;
    
    bus.location.lat += Math.cos(angle) * movementSpeed * (Math.random() - 0.5);
    bus.location.lng += Math.sin(angle) * movementSpeed * (Math.random() - 0.5);
    
    // Occasionally change heading
    if (Math.random() < 0.05) { // 5% chance
      bus.heading = (bus.heading + (Math.random() - 0.5) * 30) % 360;
    }
  }

  // Get all buses
  getAllBuses() {
    return Array.from(this.buses.values());
  }

  // Get all stops
  getAllStops() {
    return Array.from(this.stops.values());
  }

  // Get buses for a specific route
  getBusesForRoute(route) {
    return this.getAllBuses().filter(bus => bus.route === route);
  }

  // Get bus by ID
  getBusById(id) {
    return this.buses.get(id);
  }

  // Add listener for bus updates
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.getAllBuses()));
  }

  // Control simulation
  startSimulation() {
    csvDataService.startSimulation();
  }

  pauseSimulation() {
    csvDataService.pauseSimulation();
  }

  stopSimulation() {
    csvDataService.stopSimulation();
  }

  setSimulationSpeed(speed) {
    csvDataService.setSimulationSpeed(speed);
  }

  // Get simulation status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      busCount: this.buses.size,
      stopCount: this.stops.size,
      routeCount: this.routes.size,
      csvStatus: csvDataService.getStatus()
    };
  }
}

// Create singleton instance
const busSimulationService = new BusSimulationService();
export default busSimulationService;
