const { getSnapshot } = require("../../server/osuBusSnapshot");

module.exports = async (request, response) => {
  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  try {
    const snapshot = await getSnapshot();
    response.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=60");
    response.status(200).json(snapshot);
  } catch (error) {
    response.status(502).json({
      message: "Failed to fetch OSU bus data",
      detail: error.message,
    });
  }
};
