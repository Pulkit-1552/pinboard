import express from "express";
import { createNotice, deleteNotice, initDb, listNotices } from "./db.js";
import { parseNoticeId, validateNotice } from "./validate.js";

const port = Number(process.env.PORT) || 3000;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "32kb" }));

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get(
  "/api/notices",
  asyncHandler(async (_req, res) => {
    res.json(await listNotices());
  }),
);

app.post(
  "/api/notices",
  asyncHandler(async (req, res) => {
    const result = validateNotice(req.body);
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    const notice = await createNotice(result.value);
    res.status(201).json(notice);
  }),
);

app.delete(
  "/api/notices/:id",
  asyncHandler(async (req, res) => {
    const id = parseNoticeId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Notice id must be a positive integer" });
      return;
    }
    const removed = await deleteNotice(id);
    if (!removed) {
      res.status(404).json({ error: "Notice not found" });
      return;
    }
    res.status(204).end();
  }),
);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

async function waitForDb() {
  const attempts = 20;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await initDb();
      return;
    } catch (error) {
      console.log(`Database not ready (${attempt}/${attempts})`);
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

await waitForDb();

app.listen(port, () => {
  console.log(`Pinboard API listening on ${port}`);
});
