const TITLE_MAX = 80;
const BODY_MAX = 500;

export function validateNotice(input) {
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";

  if (!title) return { error: "Title is required" };
  if (!body) return { error: "Message is required" };
  if (title.length > TITLE_MAX) {
    return { error: `Title must be ${TITLE_MAX} characters or fewer` };
  }
  if (body.length > BODY_MAX) {
    return { error: `Message must be ${BODY_MAX} characters or fewer` };
  }

  return { value: { title, body } };
}

export function parseNoticeId(raw) {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) return null;
  return id;
}
