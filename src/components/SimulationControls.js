import React from 'react';
import { useBus } from '../context/BusContext';
import './SimulationControls.css';

const SimulationControls = () => {
  const {
    simulationStatus,
    startSimulation,
    pauseSimulation,
    stopSimulation,
    setSimulationSpeed
  } = useBus();

  const handleSpeedChange = (e) => {
    const speed = parseFloat(e.target.value);
    setSimulationSpeed(speed);
  };

  return (
    <div className="simulation-controls">
      <div className="simulation-controls-header">
        <h3>Simulation Controls</h3>
        <div className="simulation-status">
          <span className={`status-indicator ${simulationStatus.isPlaying ? 'playing' : 'paused'}`}>
            {simulationStatus.isPlaying ? '▶️ Playing' : '⏸️ Paused'}
          </span>
        </div>
      </div>
      
      <div className="control-buttons">
        <button
          onClick={startSimulation}
          disabled={simulationStatus.isPlaying}
          className="control-btn play-btn"
        >
          ▶️ Play
        </button>
        
        <button
          onClick={pauseSimulation}
          disabled={!simulationStatus.isPlaying}
          className="control-btn pause-btn"
        >
          ⏸️ Pause
        </button>
        
        <button
          onClick={stopSimulation}
          className="control-btn stop-btn"
        >
          ⏹️ Stop
        </button>
      </div>
      
      <div className="speed-control">
        <label htmlFor="speed-slider">Speed: {simulationStatus.speed}x</label>
        <input
          id="speed-slider"
          type="range"
          min="0.25"
          max="4"
          step="0.25"
          value={simulationStatus.speed}
          onChange={handleSpeedChange}
          className="speed-slider"
        />
        <div className="speed-labels">
          <span>0.25x</span>
          <span>1x</span>
          <span>2x</span>
          <span>4x</span>
        </div>
      </div>
      
      <div className="simulation-info">
        <p>Using real OSU bus traffic data from CSV</p>
        <p>Data loops continuously through 2 months of records</p>
      </div>
    </div>
  );
};

export default SimulationControls;
