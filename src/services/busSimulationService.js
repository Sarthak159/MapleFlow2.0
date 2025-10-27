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
    console.log('Unique stops from CSV:', uniqueStops);
    
    // Stop locations matching CSV data exactly
    const stopLocations = {
      // Campus Connector stops
      'Mount Hall (EB)': { lat: 40.00407, lng: -83.03678 },
      'Mount Hall (WB)': { lat: 40.00407, lng: -83.03678 },
      'Carmack 5 (NB)': { lat: 40.00470, lng: -83.05060 },
      'Carmack 5 (SB)': { lat: 40.00470, lng: -83.05060 },
      'Research Center (SB)': { lat: 40.00635, lng: -83.05330 },
      
      // Campus Loop South stops
      'Arps Hall (NB)': { lat: 40.00195, lng: -83.00943 },
      '11th & Worthington (EB)': { lat: 39.99665, lng: -83.01095 },
      'Blackburn House (WB)': { lat: 40.00162, lng: -83.00986 },
      'Herrick Drive Transit Hub (NB)': { lat: 39.99474, lng: -83.01950 },
      'Mack Hall (NB)': { lat: 39.99603, lng: -83.01434 },
      'Mason Hall (WB)': { lat: 40.004914, lng: -83.015611 },
      'Ohio Union (NB)': { lat: 39.998361, lng: -83.00776 },
      'Ohio Union (SB)': { lat: 39.998361, lng: -83.00776 },
      'Siebert Hall (WB)': { lat: 39.99590, lng: -83.01227 },
      'St. John Arena (EB)': { lat: 40.00528, lng: -83.01889 },
      'St. John Arena (WB)': { lat: 40.00528, lng: -83.01889 },
      
      // East Residential stops
      '11th & High (EB)': { lat: 39.99635, lng: -83.00755 },
      '11th & High (WB)': { lat: 39.99635, lng: -83.00755 },
      '15th Ave (NB)': { lat: 39.99903, lng: -83.00683 },
      '15th Ave (SB)': { lat: 39.99903, lng: -83.00683 },
      '18th Ave (NB)': { lat: 40.00138, lng: -83.00690 },
      '18th Ave (SB)': { lat: 40.00138, lng: -83.00690 },
      'Alden Ave (NB)': { lat: 40.00150, lng: -83.00650 },
      'Alden Ave (SB)': { lat: 40.00150, lng: -83.00650 },
      'Chittenden Ave (NB)': { lat: 39.99533, lng: -83.00645 },
      'Chittenden Ave (SB)': { lat: 39.99533, lng: -83.00645 },
      'High St & 15th Ave (SB)': { lat: 39.99900, lng: -83.00760 },
      'Indianola Ave (EB)': { lat: 39.99770, lng: -83.00090 },
      'Indianola Ave (WB)': { lat: 39.99770, lng: -83.00090 },
      'Lane Ave (SB)': { lat: 40.00050, lng: -83.00550 },
      'Maynard Ave (NB)': { lat: 40.00080, lng: -83.00580 },
      'Maynard Ave (SB)': { lat: 40.00080, lng: -83.00580 },
      'Mid Towers (NB)': { lat: 39.99902, lng: -83.02155 },
      'Mid Towers (SB)': { lat: 39.99847, lng: -83.02197 },
      'Tompkins St (SB)': { lat: 40.00120, lng: -83.00620 },
      
      // Med Center stops
      'Buckeye Lot (SB)': { lat: 40.00980, lng: -83.04295 },
      'Carmack 2 (SB)': { lat: 40.00635, lng: -83.05330 },
      'Carmack 3 (NB)': { lat: 40.00635, lng: -83.05330 },
      'Fred Taylor & Schottenstein Dr (NB)': { lat: 40.01563, lng: -83.03005 },
      'Kinnear Rd Lot (EB)': { lat: 40.01892, lng: -83.05468 },
      'Knowlton Hall (EB)': { lat: 40.003535, lng: -83.016780 },
      'Midwest Campus (EB)': { lat: 40.01455, lng: -83.02844 },
      'Midwest Campus (WB)': { lat: 40.01452, lng: -83.02942 },
      'Service Annex (WB)': { lat: 40.02466, lng: -83.05683 },
      'Stillman Hall (SB)': { lat: 40.00174, lng: -83.01071 },
      'Stores & Receiving (SB)': { lat: 40.01432, lng: -83.03557 },
      
      // Northwest Connector stops
      'Blankenship Hall (EB)': { lat: 40.00483, lng: -83.02864 },
      'Fisher Commons (NB)': { lat: 40.01147, lng: -83.04695 },
      'Fontana Lab (EB)': { lat: 40.003656, lng: -83.012825 }
    };
    

    uniqueStops.forEach(stopName => {
      const location = stopLocations[stopName] || { lat: 40.0000, lng: -83.0200 };
      if (!stopLocations[stopName]) {
        console.log(`Missing location for stop: ${stopName}`);
      }
      this.stops.set(stopName, {
        id: csvDataService.mapStopNameToId(stopName),
        name: stopName,
        location,
        isFavorite: false
      });
    });
    
    console.log(`Setup ${this.stops.size} stops`);
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

  // Simulate bus movement along routes
  simulateBusMovement(bus) {
    const routeStops = this.getStopsForRoute(bus.route);
    if (routeStops.length < 2) return;

    // Initialize route progress if not set
    if (!bus.routeProgress) {
      bus.routeProgress = 0; // 0 to 1, where 0 is start, 1 is end
      bus.routeDirection = 1; // 1 for forward, -1 for backward
    }

    // Calculate movement along route
    const movementSpeed = 0.001; // How fast buses move along route
    bus.routeProgress += movementSpeed * bus.routeDirection;

    // Reverse direction at route ends
    if (bus.routeProgress >= 1) {
      bus.routeProgress = 1;
      bus.routeDirection = -1;
    } else if (bus.routeProgress <= 0) {
      bus.routeProgress = 0;
      bus.routeDirection = 1;
    }

    // Calculate position along route
    const currentStopIndex = Math.floor(bus.routeProgress * (routeStops.length - 1));
    const nextStopIndex = Math.min(currentStopIndex + 1, routeStops.length - 1);
    
    const currentStop = routeStops[currentStopIndex];
    const nextStop = routeStops[nextStopIndex];
    
    if (currentStop && nextStop) {
      // Interpolate position between stops
      const progress = (bus.routeProgress * (routeStops.length - 1)) - currentStopIndex;
      
      bus.location.lat = currentStop.location.lat + 
        (nextStop.location.lat - currentStop.location.lat) * progress;
      bus.location.lng = currentStop.location.lng + 
        (nextStop.location.lng - currentStop.location.lng) * progress;
      
      // Update current stop
      bus.currentStop = currentStop.name;
      
      // Calculate heading based on direction to next stop
      const deltaLat = nextStop.location.lat - currentStop.location.lat;
      const deltaLng = nextStop.location.lng - currentStop.location.lng;
      bus.heading = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
      
      // Update next stops for display
      bus.nextStops = this.generateNextStops(routeStops, currentStop);
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
