export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const GENERIC = "Something went wrong. Please try again.";
const MESSAGES: Record<number, string> = {
  401: "Session expired, please sign in again.",
  403: "You don't have permission to edit vehicles.",
  404: "Vehicle not found.",
  409: "This vehicle was updated by someone else. Refresh and try again.",
};

// App registers this; it only acts when a signed-in user hits a 401 (expiry).
let handleUnauthorized: (message: string) => void = () => {};
export function onUnauthorized(handler: typeof handleUnauthorized) {
  handleUnauthorized = handler;
}

export async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method,
      credentials: "include",
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, GENERIC);
  }

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    fields?: Record<string, unknown>;
  } | null;

  if (response.ok) {
    return data as T;
  }

  // 400 body: { error?: string, fields?: { [field]: message } }
  const fields: Record<string, string> = {};
  for (const [name, value] of Object.entries(data?.fields ?? {})) {
    fields[name] = String(value);
  }

  let message = MESSAGES[response.status] ?? GENERIC;
  if (response.status === 400) {
    message = Object.keys(fields).length > 0 ? "Please correct the highlighted fields." : (data?.error ?? GENERIC);
  }
  if (response.status === 401) {
    handleUnauthorized(message);
  }

  throw new ApiError(response.status, message, fields);
}
