import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { orders } from "./db/schema";
import { publishEvent } from "./events";

const CATALOG_SERVICE_URL =
  process.env.CATALOG_SERVICE_URL || "http://localhost:3001";

interface CatalogLens {
  id: string;
  modelName: string;
  manufacturerName: string;
  dayPrice: string;
}

const healthResponse = t.Object({
  status: t.String(),
  service: t.String(),
});

const errorResponse = t.Object({
  error: t.String(),
});

const orderResponse = t.Object({
  id: t.String({ format: "uuid" }),
  customerName: t.String(),
  customerEmail: t.String({ format: "email" }),
  lensId: t.String({ format: "uuid" }),
  lensSnapshot: t.Object({
    modelName: t.String(),
    manufacturerName: t.String(),
    dayPrice: t.String(),
  }),
  startDate: t.String({ format: "date-time" }),
  endDate: t.String({ format: "date-time" }),
  totalPrice: t.String(),
  status: t.String(),
  createdAt: t.String({ format: "date-time" }),
});

function serializeOrder(order: typeof orders.$inferSelect) {
  return {
    ...order,
    startDate: order.startDate.toISOString(),
    endDate: order.endDate.toISOString(),
    createdAt: order.createdAt.toISOString(),
  };
}

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Suilens Order Service API",
          version: "1.0.0",
          description: "Order service for the Suilens microservice system.",
        },
        tags: [{ name: "Orders" }, { name: "Health" }],
      },
    }),
  )
  .post(
    "/api/orders",
    async ({ body, set }) => {
      const lensResponse = await fetch(
        `${CATALOG_SERVICE_URL}/api/lenses/${body.lensId}`,
      );
      if (!lensResponse.ok) {
        return new Response(JSON.stringify({ error: "Lens not found" }), {
          status: 404,
        });
      }
      const lens = (await lensResponse.json()) as CatalogLens;

      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days <= 0) {
        return new Response(
          JSON.stringify({ error: "End date must be after start date" }),
          { status: 400 },
        );
      }
      const totalPrice = (days * parseFloat(lens.dayPrice)).toFixed(2);

      const [order] = await db
        .insert(orders)
        .values({
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          lensId: body.lensId,
          lensSnapshot: {
            modelName: lens.modelName,
            manufacturerName: lens.manufacturerName,
            dayPrice: lens.dayPrice,
          },
          startDate: start,
          endDate: end,
          totalPrice,
        })
        .returning();
      if (!order) {
        return new Response(
          JSON.stringify({ error: "Failed to create order" }),
          { status: 500 },
        );
      }

      await publishEvent("order.placed", {
        orderId: order.id,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        lensName: lens.modelName,
      });

      set.status = 201;
      return serializeOrder(order);
    },
    {
      tags: ["Orders"],
      detail: {
        summary: "Create a rental order",
      },
      body: t.Object({
        customerName: t.String(),
        customerEmail: t.String({ format: "email" }),
        lensId: t.String({ format: "uuid" }),
        startDate: t.String({ format: "date" }),
        endDate: t.String({ format: "date" }),
      }),
      response: {
        201: orderResponse,
        400: errorResponse,
        404: errorResponse,
        500: errorResponse,
      },
    },
  )
  .get(
    "/api/orders",
    async () => {
      const rows = await db.select().from(orders);
      return rows.map(serializeOrder);
    },
    {
      tags: ["Orders"],
      detail: {
        summary: "List all orders",
      },
      response: t.Array(orderResponse),
    },
  )
  .get(
    "/api/orders/:id",
    async ({ params }) => {
      const results = await db
        .select()
        .from(orders)
        .where(eq(orders.id, params.id));
      if (!results[0]) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
        });
      }
      return serializeOrder(results[0]);
    },
    {
      tags: ["Orders"],
      detail: {
        summary: "Get order by id",
      },
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
      response: {
        200: orderResponse,
        404: errorResponse,
      },
    },
  )
  .get(
    "/health",
    () => ({ status: "ok", service: "order-service" }),
    {
      tags: ["Health"],
      detail: {
        summary: "Health check",
      },
      response: healthResponse,
    },
  )
  .listen(3002);

console.log(`Order Service running on port ${app.server?.port}`);
