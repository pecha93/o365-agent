import Fastify from "fastify";
import { healthRoutes } from "./health";

test("GET /health returns ok", async () => {
  const app = Fastify();
  await app.register(healthRoutes);
  const res = await app.inject({ method: "GET", url: "/health" });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ ok: true });
});


