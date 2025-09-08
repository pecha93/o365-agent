import fp from "fastify-plugin";
import rawBody from "fastify-raw-body";

export default fp(async (app) => {
  await app.register(rawBody, {
    field: "rawBody",
    global: true,
    runFirst: true,
    encoding: "utf8",
  });
});


