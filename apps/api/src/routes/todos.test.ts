import Fastify from "fastify";
import { todoRoutes } from "./todos";

function buildApp() {
  const app = Fastify();
  // Мокаем prisma в инстансе
  // @ts-expect-error augment
  app.decorate("prisma", {
    todo: {
      findMany: async () => [{ id: "1", title: "X", done: false, createdAt: new Date() }],
      create: async ({ data }: any) => ({ id: "2", title: data.title, done: false, createdAt: new Date() }),
    },
  });
  return app;
}

test("GET /todos returns list", async () => {
  const app = buildApp();
  await app.register(todoRoutes);
  const res = await app.inject({ method: "GET", url: "/todos" });
  expect(res.statusCode).toBe(200);
  const arr = res.json();
  expect(Array.isArray(arr)).toBe(true);
});

test("POST /todos validates body", async () => {
  const app = buildApp();
  await app.register(todoRoutes);
  const bad = await app.inject({ method: "POST", url: "/todos", payload: {} });
  expect(bad.statusCode).toBe(400);

  const ok = await app.inject({ method: "POST", url: "/todos", payload: { title: "Task" } });
  expect(ok.statusCode).toBe(201);
});


