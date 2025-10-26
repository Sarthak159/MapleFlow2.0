// CSV Data Service for OSU Bus Traffic Simulation
class CSVDataService {
  constructor() {
    this.csvData = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.simulationSpeed = 1; // 1x normal speed
    this.intervalId = null;
    this.listeners = [];
  }

  // Load CSV data
  async loadCSVData() {
    try {
      const response = await fetch('/osu_cabs_people_traffic_2months.csv');
      const csvText = await response.text();
      this.csvData = this.parseCSV(csvText);
      console.log(`Loaded ${this.csvData.length} records from CSV`);
      return this.csvData;
    } catch (error) {
      console.error('Error loading CSV data:', error);
      return [];
    }
  }

  // Parse CSV text into array of objects
  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length === headers.length) {
          const record = {};
          headers.forEach((header, index) => {
            record[header.trim()] = values[index].trim();
          });
          data.push(record);
        }
      }
    }
    return data;
  }

  // Parse a single CSV line handling commas within quotes
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // Map CSV stop names to app stop IDs
  mapStopNameToId(stopName) {
    const stopMapping = {
      'Arps Hall (NB)': 'arps-hall',
      '11th & Worthington (EB)': '11th-worthington',
      'Blackburn House (WB)': 'blackburn-house',
      'Brain and Spine Hospital': 'brain-spine-hospital',
      'Gray': 'gray',
      'Herrick Drive Transit Hub (NB)': 'herrick-transit-hub',
      'Mack Hall (NB)': 'mack-hall',
      'Mason Hall (WB)': 'mason-hall',
      'Ohio Union (NB)': 'ohio-union',
      'Ohio Union (SB)': 'ohio-union',
      'Ross Heart Hospital': 'ross-heart-hospital',
      'Scarlet': 'scarlet',
      'Siebert Hall (WB)': 'siebert-hall',
      'St. John Arena (EB)': 'st-john-arena',
      'The James Cancer Hospital': 'james-cancer-hospital',
      'University Hospital': 'university-hospital',
      'Mount Hall (WB)': 'mount-hall',
      'Carmack 5 (NB)': 'carmack-5-nb',
      'Carmack 5 (SB)': 'carmack-5-sb',
      'Research Center (SB)': 'research-center',
      'Kinnear Rd Lot (EB)': 'kinnear-rd-lot',
      'Blankenship Hall (EB)': 'blankenship-hall',
      'Midwest Campus (EB)': 'midwest-campus',
      'Fontana Lab (EB)': 'fontana-lab',
      'Stillman Hall (SB)': 'stillman-hall'
    };
    return stopMapping[stopName] || stopName.toLowerCase().replace(/\s+/g, '-');
  }

  // Get current simulation data
  getCurrentData() {
    if (this.csvData.length === 0) return null;
    return this.csvData[this.currentIndex];
  }

  // Start simulation
  startSimulation() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.intervalId = setInterval(() => {
      this.nextStep();
    }, 1000 / this.simulationSpeed); // Update every second (adjusted for speed)
  }

  // Pause simulation
  pauseSimulation() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Stop simulation and reset
  stopSimulation() {
    this.pauseSimulation();
    this.currentIndex = 0;
  }

  // Set simulation speed
  setSimulationSpeed(speed) {
    this.simulationSpeed = speed;
    if (this.isPlaying) {
      this.pauseSimulation();
      this.startSimulation();
    }
  }

  // Move to next step in simulation
  nextStep() {
    if (this.csvData.length === 0) return;
    
    this.currentIndex = (this.currentIndex + 1) % this.csvData.length;
    this.notifyListeners();
  }

  // Move to previous step
  previousStep() {
    if (this.csvData.length === 0) return;
    
    this.currentIndex = this.currentIndex === 0 ? this.csvData.length - 1 : this.currentIndex - 1;
    this.notifyListeners();
  }

  // Jump to specific time
  jumpToTime(timeString) {
    const targetTime = timeString.split(':');
    const targetHour = parseInt(targetTime[0]);
    const targetMinute = parseInt(targetTime[1]);
    
    const matchingIndex = this.csvData.findIndex(record => {
      const recordTime = record.time.split(':');
      const recordHour = parseInt(recordTime[0]);
      const recordMinute = parseInt(recordTime[1]);
      return recordHour === targetHour && recordMinute === targetMinute;
    });
    
    if (matchingIndex !== -1) {
      this.currentIndex = matchingIndex;
      this.notifyListeners();
    }
  }

  // Add listener for data updates
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  notifyListeners() {
    const currentData = this.getCurrentData();
    this.listeners.forEach(listener => listener(currentData));
  }

  // Get simulation status
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentIndex: this.currentIndex,
      totalRecords: this.csvData.length,
      simulationSpeed: this.simulationSpeed,
      currentData: this.getCurrentData()
    };
  }

  // Get data for specific route
  getDataForRoute(route) {
    return this.csvData.filter(record => record.route === route);
  }

  // Get data for specific stop
  getDataForStop(stopName) {
    return this.csvData.filter(record => record.bus_stop === stopName);
  }

  // Get unique routes
  getUniqueRoutes() {
    const routes = [...new Set(this.csvData.map(record => record.route))];
    return routes;
  }

  // Get unique stops
  getUniqueStops() {
    const stops = [...new Set(this.csvData.map(record => record.bus_stop))];
    return stops;
  }
}

// Create singleton instance
const csvDataService = new CSVDataService();
export default csvDataService;
