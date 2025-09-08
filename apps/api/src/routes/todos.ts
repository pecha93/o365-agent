import { FastifyInstance } from "fastify";
import { z } from "zod";

const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
});

export async function todoRoutes(app: FastifyInstance) {
  app.get("/todos", async () => {
    return app.prisma.todo.findMany({
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/todos", async (req, reply) => {
    const parsed = createTodoSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "Invalid body", issues: parsed.error.issues };
    }
    const todo = await app.prisma.todo.create({
      data: { title: parsed.data.title },
    });
    reply.code(201);
    return todo;
  });
}


