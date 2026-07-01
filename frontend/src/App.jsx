import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Search, ArrowLeft, TrendingUp, Building2 } from "lucide-react";
import { api } from "./api";

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
};
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const STATUS_LABEL = { active: "진행중", completed: "완료", closed: "종료" };
const STATUS_STYLE = {
  active: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  closed: "bg-slate-100 text-slate-500 border border-slate-200",
};
const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

export default function App() {
  const [managers, setManagers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState({ page: "dashboard" });
  const [statusTab, setStatusTab] = useState("all");
  const [query, setQuery] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, c, r] = await Promise.all([api.getManagers(), api.getCompanies(), api.getAllRecords()]);
      setManagers(m);
      setCompanies(c);
      setRecords(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const managerName = (id) => managers.find((m) => m.id === id)?.name ?? "-";

  const companyStats = useMemo(() => {
    const today = todayStr();
    return companies.map((c) => {
      const crecs = records.filter((r) => r.company_id === c.id);
      const cumulative = crecs.reduce((s, r) => s + Number(r.count), 0);
      const todayCount = crecs
        .filter((r) => r.recruit_date?.slice(0, 10) === today)
        .reduce((s, r) => s + Number(r.count), 0);
      const target = Number(c.target) || 0;
      const remaining = Math.max(target - cumulative, 0);
      const rate = target > 0 ? Math.min(Math.round((cumulative / target) * 100), 100) : 0;
      return { ...c, target, cumulative, todayCount, remaining, rate };
    });
  }, [companies, records]);

  const filteredStats = companyStats.filter((c) => {
    if (statusTab !== "all" && c.status !== statusTab) return false;
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const globalStats = useMemo(() => {
    const today = todayStr();
    const yesterday = daysAgo(1);
    const sumByDate = (date) =>
      records.filter((r) => r.recruit_date?.slice(0, 10) === date).reduce((s, r) => s + Number(r.count), 0);
    const todayTotal = sumByDate(today);
    const yesterdayTotal = sumByDate(yesterday);
    const thisWeekDays = Array.from({ length: 7 }, (_, i) => 6 - i).map((i) => ({ date: daysAgo(i), count: sumByDate(daysAgo(i)) }));
    const lastWeekDays = Array.from({ length: 7 }, (_, i) => 6 - i).map((i) => ({ date: daysAgo(i + 7), count: sumByDate(daysAgo(i + 7)) }));
    const weekTotal = thisWeekDays.reduce((s, d) => s + d.count, 0);
    const lastWeekTotal = lastWeekDays.reduce((s, d) => s + d.count, 0);
    const weekDiff = weekTotal - lastWeekTotal;
    const weekDiffPct = lastWeekTotal > 0 ? Math.round((weekDiff / lastWeekTotal) * 100) : null;
    const now = new Date();
    const monthTotal = records
      .filter((r) => {
        const d = new Date(r.recruit_date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, r) => s + Number(r.count), 0);
    const activeCount = companies.filter((c) => c.status === "active").length;
    const completedCount = companies.filter((c) => c.status === "completed").length;
    return {
      todayTotal,
      diff: todayTotal - yesterdayTotal,
      weekTotal,
      lastWeekTotal,
      weekDiff,
      weekDiffPct,
      thisWeekDays,
      lastWeekDays,
      monthTotal,
      activeCount,
      completedCount,
    };
  }, [records, companies]);

  async function addCompany(data) {
    const created = await api.createCompany(data);
    setCompanies((prev) => [created, ...prev]);
    setView({ page: "dashboard" });
  }

  async function addRecord(companyId, date, count) {
    if (!count || count <= 0) return;
    const saved = await api.addRecord(companyId, date, count);
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  }

  async function updateCompanyStatus(companyId, status) {
    const updated = await api.updateCompany(companyId, { status });
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? updated : c)));
  }

  async function updateMemo(companyId, memo) {
    const updated = await api.updateCompany(companyId, { memo });
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? updated : c)));
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm">
        <p className="text-red-600">서버에 연결할 수 없습니다: {error}</p>
        <button onClick={loadAll} className="border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto px-5 py-6">
        {view.page === "dashboard" && (
          <Dashboard
            stats={globalStats}
            filteredStats={filteredStats}
            managerName={managerName}
            statusTab={statusTab}
            setStatusTab={setStatusTab}
            query={query}
            setQuery={setQuery}
            onAdd={() => setView({ page: "add" })}
            onOpen={(id) => setView({ page: "detail", id })}
          />
        )}
        {view.page === "add" && (
          <AddCompany managers={managers} onCancel={() => setView({ page: "dashboard" })} onSave={addCompany} />
        )}
        {view.page === "detail" && (
          <CompanyDetail
            company={companyStats.find((c) => c.id === view.id)}
            managerName={managerName}
            records={records
              .filter((r) => r.company_id === view.id)
              .sort((a, b) => (a.recruit_date < b.recruit_date ? 1 : -1))}
            onBack={() => setView({ page: "dashboard" })}
            onAddRecord={(date, count) => addRecord(view.id, date, count)}
            onStatusChange={(status) => updateCompanyStatus(view.id, status)}
            onMemoChange={(memo) => updateMemo(view.id, memo)}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        {Icon && <Icon size={16} className="text-slate-400" />}
      </div>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

function WeekCompare({ thisWeekDays, lastWeekDays, weekTotal, lastWeekTotal }) {
  const max = Math.max(1, ...thisWeekDays.map((d) => d.count), ...lastWeekDays.map((d) => d.count));
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">이번주 vs 전주</span>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-900" /> 이번주 {weekTotal}명
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> 전주 {lastWeekTotal}명
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {thisWeekDays.map((d, i) => {
          const lw = lastWeekDays[i];
          const dow = WEEKDAY_LABEL[new Date(d.date).getDay()];
          return (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <div className="w-full h-24 flex items-end gap-1">
                <div
                  className="flex-1 bg-slate-300 rounded-sm"
                  style={{ height: `${Math.max((lw.count / max) * 100, lw.count > 0 ? 6 : 0)}%` }}
                  title={`전주 ${lw.count}명`}
                />
                <div
                  className="flex-1 bg-slate-900 rounded-sm"
                  style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 6 : 0)}%` }}
                  title={`이번주 ${d.count}명`}
                />
              </div>
              <span className="text-xs text-slate-400">{dow}</span>
              <span className="text-xs tabular-nums text-slate-600">{d.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ stats, filteredStats, managerName, statusTab, setStatusTab, query, setQuery, onAdd, onOpen }) {
  const tabs = [
    { key: "all", label: "전체" },
    { key: "active", label: "진행중" },
    { key: "completed", label: "완료" },
    { key: "closed", label: "종료" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">모집관리 시스템</h1>
          <p className="text-sm text-slate-500 mt-0.5">{todayStr()}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition"
        >
          <Plus size={16} /> 업체추가
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="오늘 모집" value={`${stats.todayTotal}명`} sub={`${stats.diff >= 0 ? "+" : ""}${stats.diff} 어제 대비`} icon={TrendingUp} />
        <StatCard
          label="이번주"
          value={`${stats.weekTotal}명`}
          sub={
            stats.weekDiffPct === null
              ? "전주 기록 없음"
              : `${stats.weekDiff >= 0 ? "+" : ""}${stats.weekDiff}명 (${stats.weekDiff >= 0 ? "+" : ""}${stats.weekDiffPct}%) 전주 대비`
          }
        />
        <StatCard label="이번달" value={`${stats.monthTotal}명`} sub="누적 합계" />
        <StatCard label="진행중 업체" value={`${stats.activeCount}개`} sub={`완료 ${stats.completedCount}개`} icon={Building2} />
      </div>

      <WeekCompare thisWeekDays={stats.thisWeekDays} lastWeekDays={stats.lastWeekDays} weekTotal={stats.weekTotal} lastWeekTotal={stats.lastWeekTotal} />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusTab(t.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                statusTab === t.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto w-full sm:w-64">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="업체명 검색"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs">
                <th className="text-left font-medium px-4 py-3">업체명</th>
                <th className="text-left font-medium px-4 py-3">담당자</th>
                <th className="text-right font-medium px-4 py-3">목표</th>
                <th className="text-right font-medium px-4 py-3">누적</th>
                <th className="text-right font-medium px-4 py-3">오늘</th>
                <th className="text-right font-medium px-4 py-3">남은</th>
                <th className="text-left font-medium px-4 py-3 w-32">달성률</th>
                <th className="text-left font-medium px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400 py-10">
                    표시할 업체가 없습니다.
                  </td>
                </tr>
              )}
              {filteredStats.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onOpen(c.id)}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition"
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{managerName(c.manager_id)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.target}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{c.cumulative}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{c.todayCount > 0 ? `+${c.todayCount}` : 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{c.remaining}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 rounded-full" style={{ width: `${c.rate}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums w-9">{c.rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddCompany({ managers, onCancel, onSave }) {
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "");
  const [target, setTarget] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const canSave = name.trim() && managerId && Number(target) > 0 && !saving;

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      await onSave({ name: name.trim(), manager_id: managerId, target: Number(target), memo });
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5 py-4">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-700">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold">업체 추가</h1>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">업체명</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="업체명을 입력하세요"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">담당자</span>
        <select
          value={managerId}
          onChange={(e) => setManagerId(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">최종 목표</span>
        <input
          type="number"
          min={1}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="목표 인원"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">메모</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
          placeholder="메모를 입력하세요"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
        />
      </label>

      <div className="flex gap-2 mt-2">
        <button
          disabled={!canSave}
          onClick={handleSave}
          className="flex-1 bg-slate-900 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-40 hover:bg-slate-800 transition"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-slate-200 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 transition"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function CompanyDetail({ company, managerName, records, onBack, onAddRecord, onStatusChange, onMemoChange }) {
  const [date, setDate] = useState(todayStr());
  const [count, setCount] = useState("");
  const [memoDraft, setMemoDraft] = useState(company?.memo ?? "");
  const [memoOpen, setMemoOpen] = useState(false);

  if (!company) {
    return (
      <div className="py-10 text-center text-slate-400">
        업체를 찾을 수 없습니다.{" "}
        <button onClick={onBack} className="underline">
          목록으로
        </button>
      </div>
    );
  }

  async function handleAdd() {
    const n = Number(count);
    if (!n || n <= 0) return;
    await onAddRecord(date, n);
    setCount("");
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-700">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{company.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[company.status]}`}>{STATUS_LABEL[company.status]}</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">담당자: {managerName(company.manager_id)}</p>
        </div>
        <select
          value={company.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="active">진행중</option>
          <option value="completed">완료</option>
          <option value="closed">종료</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="목표" value={`${company.target}명`} />
        <StatCard label="현재" value={`${company.cumulative}명`} />
        <StatCard label="남은 인원" value={`${company.remaining}명`} />
        <StatCard label="달성률" value={`${company.rate}%`} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">목표 진행률</span>
          <span className="text-sm text-slate-500 tabular-nums">{company.rate}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-900 rounded-full transition-all" style={{ width: `${company.rate}%` }} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
        <span className="text-sm font-medium">모집 입력</span>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="모집 인원"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            onClick={handleAdd}
            className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            추가
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-medium">일별 모집 이력</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left font-medium px-4 py-2">날짜</th>
                <th className="text-right font-medium px-4 py-2">모집</th>
                <th className="text-right font-medium px-4 py-2">누적</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-slate-400 py-8">
                    아직 등록된 모집 기록이 없습니다.
                  </td>
                </tr>
              )}
              {(() => {
                let running = company.cumulative;
                return records.map((r) => {
                  const cum = running;
                  running -= Number(r.count);
                  return (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2 text-slate-600">{fmtDate(r.recruit_date)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.count}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-500">{cum}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">메모</span>
          {!memoOpen && (
            <button onClick={() => setMemoOpen(true)} className="text-xs text-slate-400 hover:text-slate-700">
              편집
            </button>
          )}
        </div>
        {memoOpen ? (
          <>
            <textarea
              value={memoDraft}
              onChange={(e) => setMemoDraft(e.target.value)}
              rows={4}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await onMemoChange(memoDraft);
                  setMemoOpen(false);
                }}
                className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-lg"
              >
                저장
              </button>
              <button onClick={() => setMemoOpen(false)} className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg">
                취소
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-600 whitespace-pre-line">
            {company.memo?.trim() ? company.memo : <span className="text-slate-300">메모가 없습니다.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
