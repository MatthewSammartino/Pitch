const BASE = import.meta.env.PROD ? "" : "";

async function request(method, path, body) {
  const opts = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || "Request failed"), { status: res.status });
  }
  return res.json();
}

export const api = {
  get:  (path)        => request("GET",    path),
  post: (path, body)  => request("POST",   path, body),
  del:  (path)        => request("DELETE", path),
  patch:(path, body)  => request("PATCH",  path, body),
};
