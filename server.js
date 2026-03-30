const express = require("express");
const path = require("path");
const { getSnapshot } = require("./server/osuBusSnapshot");

const app = express();
const port = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === "production";
const buildPath = path.join(__dirname, "build");

app.use(express.json());

app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  next();
});

app.get("/api/osu-bus/snapshot", async (request, response) => {
  try {
    const snapshot = await getSnapshot();
    response.json(snapshot);
  } catch (error) {
    response.status(502).json({
      message: "Failed to fetch OSU bus data",
      detail: error.message,
    });
  }
});

if (isProduction) {
  app.use(express.static(buildPath));
  app.get("*", (request, response) => {
    response.sendFile(path.join(buildPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`OSU bus proxy listening on port ${port}`);
});
