import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { lenses } from "./db/schema";

const healthResponse = t.Object({
  status: t.String(),
  service: t.String(),
});

const errorResponse = t.Object({
  error: t.String(),
});

const lensResponse = t.Object({
  id: t.String({ format: "uuid" }),
  modelName: t.String(),
  manufacturerName: t.String(),
  minFocalLength: t.Number(),
  maxFocalLength: t.Number(),
  maxAperture: t.String(),
  mountType: t.String(),
  dayPrice: t.String(),
  weekendPrice: t.String(),
  description: t.Any(),
});

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Suilens Catalog Service API",
          version: "1.0.0",
          description: "Catalog service for the Suilens microservice system.",
        },
        tags: [{ name: "Lenses" }, { name: "Health" }],
      },
    }),
  )
  .get(
    "/api/lenses",
    async () => {
      return db.select().from(lenses);
    },
    {
      tags: ["Lenses"],
      detail: {
        summary: "List all lenses",
      },
      response: t.Array(lensResponse),
    },
  )
  .get(
    "/api/lenses/:id",
    async ({ params }) => {
      const results = await db
        .select()
        .from(lenses)
        .where(eq(lenses.id, params.id));

      if (!results[0]) {
        return new Response(JSON.stringify({ error: "Lens not found" }), {
          status: 404,
        });
      }

      return results[0];
    },
    {
      tags: ["Lenses"],
      detail: {
        summary: "Get lens by id",
      },
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
      response: {
        200: lensResponse,
        404: errorResponse,
      },
    },
  )
  .get(
    "/health",
    () => ({ status: "ok", service: "catalog-service" }),
    {
      tags: ["Health"],
      detail: {
        summary: "Health check",
      },
      response: healthResponse,
    },
  )
  .listen(3001);

console.log(`Catalog Service running on port ${app.server?.port}`);
