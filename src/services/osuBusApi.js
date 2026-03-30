const DEV_SERVER_ORIGIN =
  typeof window !== "undefined" &&
  window.location.hostname === "localhost" &&
  window.location.port === "3000"
    ? "http://localhost:3001"
    : "";

function getApiBaseUrl() {
  return process.env.REACT_APP_API_BASE_URL || DEV_SERVER_ORIGIN;
}

export async function fetchOsuBusSnapshot(signal) {
  const response = await fetch(`${getApiBaseUrl()}/api/osu-bus/snapshot`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bus snapshot (${response.status})`);
  }

  return response.json();
}
