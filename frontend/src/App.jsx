import { useEffect, useState } from "react";

const emptyForm = { title: "", body: "" };

function formatWhen(iso) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function App() {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/notices");
    if (!response.ok) throw new Error("Could not load notices");
    setNotices(await response.json());
  }

  useEffect(() => {
    let active = true;
    load()
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.body.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not pin notice");
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm("Take this notice down?")) return;
    setError("");
    try {
      const response = await fetch(`/api/notices/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not remove notice");
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const canSubmit = form.title.trim() && form.body.trim() && !saving;

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="eyebrow">Shared board</p>
          <h1>Pinboard</h1>
        </div>
        <p className="lede">
          Short notices for the class. They stay stored until someone takes
          them down.
        </p>
      </header>

      {error ? (
        <p className="banner" role="alert">
          {error}
        </p>
      ) : null}

      <main className="layout">
        <form className="paper form" onSubmit={onSubmit}>
          <h2>Pin a notice</h2>
          <label>
            Title
            <input
              name="title"
              maxLength={80}
              value={form.title}
              onChange={updateField}
              placeholder="OS lab moved"
              required
            />
          </label>
          <label>
            Message
            <textarea
              name="body"
              maxLength={500}
              rows={5}
              value={form.body}
              onChange={updateField}
              placeholder="Today the lab is in room 204, not 118."
              required
            />
          </label>
          <button type="submit" disabled={!canSubmit}>
            {saving ? "Pinning…" : "Pin notice"}
          </button>
        </form>

        <section className="list" aria-live="polite">
          {loading ? <p className="status">Loading notices…</p> : null}
          {!loading && notices.length === 0 ? (
            <p className="status">Nothing pinned yet.</p>
          ) : null}
          {notices.map((notice) => (
            <article key={notice.id} className="paper note">
              <h2>{notice.title}</h2>
              <p>{notice.body}</p>
              <footer>
                <time dateTime={notice.createdAt}>
                  {formatWhen(notice.createdAt)}
                </time>
                <button type="button" onClick={() => onDelete(notice.id)}>
                  Take down
                </button>
              </footer>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
