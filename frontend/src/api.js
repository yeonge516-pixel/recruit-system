const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `요청 실패 (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getManagers: () => request("/managers"),
  createManager: (name) => request("/managers", { method: "POST", body: JSON.stringify({ name }) }),

  getCompanies: () => request("/companies"),
  createCompany: (data) => request("/companies", { method: "POST", body: JSON.stringify(data) }),
  updateCompany: (id, data) => request(`/companies/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCompany: (id) => request(`/companies/${id}`, { method: "DELETE" }),

  getAllRecords: () => request("/records"),
  getCompanyRecords: (companyId) => request(`/companies/${companyId}/records`),
  addRecord: (companyId, recruit_date, count) =>
    request(`/companies/${companyId}/records`, { method: "POST", body: JSON.stringify({ recruit_date, count }) }),
};
