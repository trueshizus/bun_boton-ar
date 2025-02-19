import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";

import api from "./api";
import dashboard from "./app";
import { websocketManager } from "./websocket"; // Import the manager

const app = new Hono();

// // Update approve endpoint to handle cache
// app.post("/api/approve/:thing", async (c) => {
//   try {
//     const thing = c.req.param("thing");
//     if (!thing.match(/^t[1-6]_[a-zA-Z0-9]+$/)) {
//       logger.warn("⚠️ Invalid thing ID format", { thing });
//       return c.json({ error: "Invalid thing ID format" }, 400);
//     }

//     logger.info("👍 Approving content", { thing });
//     const result = await client.approve(thing);

//     logger.info("✅ Successfully approved content", { thing });
//     return c.json(result);
//   } catch (err) {
//     logger.error("❌ Error approving content", {
//       thing: c.req.param("thing"),
//       error: err,
//     });
//     return c.json({ error: "Error approving thing" }, 500);
//   }
// });

// // Update remove endpoint similarly
// app.post("/api/remove/:thing", async (c) => {
//   try {
//     const thing = c.req.param("thing");
//     if (!thing.match(/^t[1-6]_[a-zA-Z0-9]+$/)) {
//       logger.warn("⚠️ Invalid thing ID format", { thing });
//       return c.json({ error: "Invalid thing ID format" }, 400);
//     }

//     logger.info("🚫 Removing content", { thing });
//     const result = await client.remove(thing);

//     logger.info("✅ Successfully removed content", { thing });
//     return c.json(result);
//   } catch (err) {
//     logger.error("❌ Error removing content", {
//       thing: c.req.param("thing"),
//       error: err,
//     });
//     return c.json({ error: "Error removing thing" }, 500);
//   }
// });

// Add rate limiting middleware
// const rateLimiter = new Map<string, number>();
// app.use("*", async (c, next) => {
//   const key = c.req.url;
//   const now = Date.now();
//   const lastRequest = rateLimiter.get(key) || 0;

//   if (now - lastRequest < 1000) {
//     logger.warn("⚠️ Rate limit exceeded", { url: key });
//     return c.json({ error: "Too many requests" }, 429);
//   }

//   rateLimiter.set(key, now);
//   await next();
// });

const { upgradeWebSocket, websocket } = createBunWebSocket();

app.get(
  "/ws",
  upgradeWebSocket(() => {
    return {
      onOpen(_event, ws) {
        console.log("WebSocket connection opened");
        websocketManager.addConnection(ws); // Add to the manager
        ws.send(
          JSON.stringify({ current_time: new Date().toLocaleTimeString() })
        );
      },

      onMessage(ws, message) {
        console.log("Received message:", message);
      },

      onClose(_event, ws) {
        console.log("WebSocket connection closed");
        websocketManager.removeConnection(ws);
      },
    };
  })
);

app.route("/", dashboard);
app.route("/api", api);

export default {
  fetch: app.fetch,
  websocket,
};
