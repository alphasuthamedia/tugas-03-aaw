import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { startConsumer } from "./consumer";
import { addClient, removeClient } from "./realtime";

const healthResponse = t.Object({
  status: t.String(),
  service: t.String(),
});

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Suilens Notification Service API",
          version: "1.0.0",
          description:
            "Notification service for the Suilens microservice system.",
        },
        tags: [{ name: "Health" }],
      },
    }),
  )
  .ws("/ws/notifications", {
    open(ws) {
      addClient(ws);
    },
    close(ws) {
      removeClient(ws);
    },
  })
  .get(
    "/health",
    () => ({ status: "ok", service: "notification-service" }),
    {
      tags: ["Health"],
      detail: {
        summary: "Health check",
      },
      response: healthResponse,
    },
  )
  .listen(3003);

startConsumer().catch(console.error);

console.log(`Notification Service running on port ${app.server?.port}`);
