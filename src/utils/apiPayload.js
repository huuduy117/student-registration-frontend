/**
 * Backend responses use two shapes:
 *   - structured: { success, action, data, affected_tables }
 *   - legacy:     raw array / object
 * These helpers normalise both so pages don't render an envelope by mistake.
 */

export const unwrapPayload = (payload) => {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "data" in payload &&
    ("success" in payload || "action" in payload)
  ) {
    return payload.data;
  }
  return payload;
};

export const unwrapList = (payload) => {
  const data = unwrapPayload(payload);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};
