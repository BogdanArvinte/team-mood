import path from "path";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import fstatic from "@fastify/static";
import sensible from "@fastify/sensible";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const fastify = Fastify({
  logger: true,
});

const adapter = new JSONFile("db.json");
const db = new Low(adapter, {
  teams: [],
});

await db.read();

fastify
  .register(helmet, {
    contentSecurityPolicy: {
      directives: {
        "script-src-elem": [
          ...helmet.contentSecurityPolicy.getDefaultDirectives()["default-src"],
          "https://cdn.jsdelivr.net",
        ],
      },
    },
  })
  .register(sensible)
  .register(fstatic, {
    root: path.join(path.resolve("."), "public"),
    prefix: "/public/",
  });

fastify.get("/", (_req, res) => {
  res.sendFile("index.html");
});

fastify.get("/emotes/:team", (req, res) => {
  try {
    const teamName = req.params.team.toUpperCase();
    if (!teamName) {
      return res.notFound(`No team with the name "${teamName}" was found.`);
    }
    const team = db.data.teams.find((t) => t.name === teamName);
    if (team) {
      return res.code(200).send(team);
    }
    res.notFound();
  } catch (e) {
    console.error(e);
    res.internalServerError();
  }
});

fastify.post("/emotes/:team", async (req, res) => {
  try {
    const { date, emote } = req.body;
    const teamName = req.params.team.toUpperCase();
    if (!date || !emote || !teamName) {
      return res.badRequest();
    }
    const team = db.data.teams.find((t) => t.name === teamName);
    if (!team) {
      return res.notFound(`No team with the name "${teamName}" was found.`);
    }
    const entry = team.entries.find((e) => e.date === date);
    if (!entry) {
      team.entries.push({ date, [emote]: 1 });
    } else {
      entry[emote] = entry[emote] + 1 || 1;
    }
    await db.write();
    res.code(200).send({ message: "Entry saved successfully." });
  } catch (e) {
    console.error(e);
    res.code(500).send({ message: "Could not save entry." });
  }
});

async function start() {
  try {
    await fastify.listen({ port: 3456, host: "0.0.0.0" });
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
