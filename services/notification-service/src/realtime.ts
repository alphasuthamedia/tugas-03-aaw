import type { ServerWebSocket } from "bun";

export interface NotificationPayload {
  id: string;
  orderId: string;
  type: string;
  recipient: string;
  message: string;
  sentAt: string;
}

const clients = new Set<ServerWebSocket<unknown>>();

export function addClient(ws: ServerWebSocket<unknown>) {
  clients.add(ws);
}

export function removeClient(ws: ServerWebSocket<unknown>) {
  clients.delete(ws);
}

export function broadcastNotification(payload: NotificationPayload) {
  const message = JSON.stringify(payload);

  for (const client of clients) {
    try {
      client.send(message);
    } catch (error) {
      console.warn("Failed to deliver websocket notification:", error);
      clients.delete(client);
    }
  }
}
