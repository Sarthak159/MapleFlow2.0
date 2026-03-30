import React, { useState } from "react";
import { X, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useBus } from "../context/BusContext";

const CrowdFeedbackModal = ({ bus, onClose }) => {
  const { updateCrowdLevel, roundToSignificantFigures } = useBus();
  const [selectedLevel, setSelectedLevel] = useState(bus.crowdLevel);
  const [submitting, setSubmitting] = useState(false);

  const crowdLevels = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Moderate" },
    { value: "high", label: "Crowded" },
  ];

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateCrowdLevel(bus.id, selectedLevel);
      toast.success("Thank you for your feedback. Estimated crowding updated.");
      onClose();
    } catch (error) {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const comfortScore = roundToSignificantFigures(bus.comfortScore || 7.5);
  const circumference = 2 * Math.PI * 45;
  const progress = (comfortScore / 10) * circumference;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-mapleflow" onClick={(event) => event.stopPropagation()}>
        <button onClick={onClose} className="close-btn-modal">
          <X size={24} />
        </button>

        <div className="modal-header-mapleflow">
          <h2>
            {bus.routeCode} - {bus.routeName}
          </h2>
          <p style={{ margin: 0, color: "#6b7280" }}>Crowding is estimated, not live OSU data.</p>
        </div>

        <div className="modal-body-mapleflow">
          <div className="modal-top-section">
            <div className="arriving-info">
              <div className="arriving-label">Arriving in</div>
              <div className="arriving-time">{bus.etaMinutes ?? "N/A"} min</div>
            </div>

            <div className="comfort-score-circle">
              <svg width="120" height="120" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="comfort-score-value">
                <div className="score-number">{comfortScore}</div>
                <div className="score-label">Comfort Score</div>
              </div>
            </div>
          </div>

          <div className="crowd-feedback-section">
            <div className="crowd-feedback-title">
              <Users size={18} />
              <span>How crowded is {bus.routeCode}?</span>
            </div>

            <div className="crowd-buttons">
              {crowdLevels.map((level) => (
                <button
                  key={level.value}
                  className={`crowd-btn ${selectedLevel === level.value ? "selected" : ""}`}
                  onClick={() => setSelectedLevel(level.value)}
                >
                  {level.label}
                </button>
              ))}
            </div>

            <button className="submit-report-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>

          <div className="next-stops-section">
            <h3>Upcoming Stops</h3>
            <div className="stops-list">
              {bus.nextStops.map((stop) => (
                <div key={`${bus.id}-${stop.stopId}`} className="stop-item">
                  <span className="stop-name">{stop.stopName}</span>
                  <span className="stop-eta">{stop.etaMinutes} min</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrowdFeedbackModal;
