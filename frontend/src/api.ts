export const api = {
  token: localStorage.getItem("kimun_token") || "",
  async req(path: string, opts: RequestInit = {}) {
    const r = await fetch(path, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}), ...(opts.headers || {}) }
    });
    if (r.status === 401) { localStorage.removeItem("kimun_token"); if (location.pathname !== "/login") location.href = "/login"; }
    if (!r.ok) throw new Error((await r.text()).slice(0, 400));
    return r.json();
  },
  get: (p: string) => api.req(p),
  post: (p: string, b: unknown) => api.req(p, { method: "POST", body: JSON.stringify(b) }),
  put: (p: string, b: unknown) => api.req(p, { method: "PUT", body: JSON.stringify(b) }),
  del: (p: string) => api.req(p, { method: "DELETE" }),
  async download(path: string, filename: string) {
    const r = await fetch(path, { headers: this.token ? { Authorization: `Bearer ${this.token}` } : {} });
    if (!r.ok) throw new Error((await r.text()).slice(0, 400));
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};

export function toast(msg: string) {
  const box = document.getElementById("toasts")!;
  const d = document.createElement("div");
  d.textContent = msg;
  box.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}
