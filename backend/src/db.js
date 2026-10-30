import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function toNotice(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at.toISOString(),
  };
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notices (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function listNotices() {
  const { rows } = await pool.query(
    "SELECT id, title, body, created_at FROM notices ORDER BY created_at DESC, id DESC",
  );
  return rows.map(toNotice);
}

export async function createNotice({ title, body }) {
  const { rows } = await pool.query(
    `INSERT INTO notices (title, body)
     VALUES ($1, $2)
     RETURNING id, title, body, created_at`,
    [title, body],
  );
  return toNotice(rows[0]);
}

export async function deleteNotice(id) {
  const result = await pool.query("DELETE FROM notices WHERE id = $1", [id]);
  return result.rowCount > 0;
}

export async function closeDb() {
  await pool.end();
}
