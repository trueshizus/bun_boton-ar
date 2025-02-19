import type { ServerWebSocket } from "bun";

type WebSocketData = {
  userId: string;
};

const connections = new Set<ServerWebSocket<WebSocketData>>();

export const websocketManager = {
  addConnection(ws: ServerWebSocket<WebSocketData>) {
    connections.add(ws);
    console.log(`WebSocket connection added. Total: ${connections.size}`);
  },

  removeConnection(ws: ServerWebSocket<WebSocketData>) {
    connections.delete(ws);
    console.log(`WebSocket connection removed. Total: ${connections.size}`);
  },

  broadcast(message: object) {
    const serializedMessage = JSON.stringify(message);
    console.log(
      `Broadcasting message to ${connections.size} clients:`,
      message
    );
    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        // Check for open connection
        try {
          ws.send(serializedMessage);
        } catch (error) {
          console.error("Failed to send message to WebSocket:", error);
          // Consider removing the connection if sending fails repeatedly
          this.removeConnection(ws);
        }
      }
    }
  },
  connections, // Expose for debugging if needed
};

export type WebSocketManager = typeof websocketManager;
