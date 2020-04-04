const path = require("path");
const fastify = require("fastify")({ logger: true });
const helmet = require("fastify-helmet");
const static = require("fastify-static");
const sensible = require("fastify-sensible");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json", {
  defaultValue: {
    teams: [],
  },
});
const db = low(adapter);

fastify
  .register(helmet)
  .register(sensible)
  .register(static, {
    root: path.join(__dirname, "public"),
    prefix: "/public/",
  });

fastify.get("/", (request, reply) => {
  reply.sendFile("index.html");
});

fastify.get("/emotes/:team", (request, reply) => {
  try {
    const teamName = request.params.team.toUpperCase();
    if (!teamName) {
      reply.notFound();
    }
    const team = db.get("teams").find({ name: teamName });
    if (team.value()) {
      reply.code(200).send(team);
    }
    reply.notFound();
  } catch {
    reply.internalServerError();
  }
});

fastify.post("/emotes/:team", (request, reply) => {
  try {
    const { date, emote } = request.body;
    const teamName = request.params.team.toUpperCase();
    if (!date || !emote || !teamName) {
      reply.badRequest();
    }
    const team = db.get("teams").find({ name: teamName });
    if (!team.value()) {
      reply.notFound(`No team with the name "${teamName}" as found.`);
    }
    const entry = team.get("entries").find({ date });
    if (!entry.value()) {
      team
        .get("entries")
        .push({ date, [emote]: 1 })
        .write();
    } else {
      const previousEmoteValue = entry.value()[emote];
      entry
        .assign({ [emote]: previousEmoteValue ? previousEmoteValue + 1 : 1 })
        .write();
    }
    reply.code(200).send({ message: "Entry saved successfully." });
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "Could not save entry." });
  }
});

const start = async () => {
  try {
    await fastify.listen(3456);
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
