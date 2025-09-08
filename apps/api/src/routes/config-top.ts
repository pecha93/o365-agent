import { FastifyInstance } from "fastify";
import { z } from "zod";
import { Source } from "@prisma/client";

export async function configTopRoutes(app: FastifyInstance) {
  app.get("/config/top", async () => {
    return app.prisma.configTop.findMany({ orderBy: { createdAt: "desc" } });
  });

  app.post("/config/top", async (req, reply) => {
    const body = z.object({
      source: z.enum(["TEAMS", "OUTLOOK", "CALENDAR"]),
      identity: z.string().min(1), // email/UPN/userId
      name: z.string().optional(),
    }).safeParse(req.body);
    if (!body.success) {
      reply.code(400);
      return { error: "Invalid body", issues: body.error.issues };
    }
    const rec = await app.prisma.configTop.upsert({
      where: { source_identity: { source: body.data.source as Source, identity: body.data.identity } },
      update: { name: body.data.name },
      create: { source: body.data.source as Source, identity: body.data.identity, name: body.data.name },
    });
    return rec;
  });

  app.delete<{ Params: { id: string } }>("/config/top/:id", async (req, reply) => {
    const id = req.params.id;
    await app.prisma.configTop.delete({ where: { id } });
    reply.code(204); return null;
  });
}


