const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- 담당자 ----------

app.get("/api/managers", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM managers ORDER BY id");
  res.json(rows);
});

app.post("/api/managers", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "담당자명을 입력하세요." });
  const { rows } = await pool.query("INSERT INTO managers (name) VALUES ($1) RETURNING *", [name.trim()]);
  res.status(201).json(rows[0]);
});

// ---------- 업체 ----------

app.get("/api/companies", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM companies ORDER BY created_at DESC");
  res.json(rows);
});

app.post("/api/companies", async (req, res) => {
  const { name, manager_id, target, memo } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "업체명을 입력하세요." });
  if (!target || target <= 0) return res.status(400).json({ error: "목표 인원을 입력하세요." });
  const { rows } = await pool.query(
    `INSERT INTO companies (name, manager_id, target, status, memo)
     VALUES ($1, $2, $3, 'active', $4) RETURNING *`,
    [name.trim(), manager_id || null, target, memo || ""]
  );
  res.status(201).json(rows[0]);
});

app.patch("/api/companies/:id", async (req, res) => {
  const { id } = req.params;
  const fields = [];
  const values = [];
  let i = 1;
  for (const key of ["name", "manager_id", "target", "status", "memo"]) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(req.body[key]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: "수정할 값이 없습니다." });
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE companies SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  if (rows.length === 0) return res.status(404).json({ error: "업체를 찾을 수 없습니다." });
  res.json(rows[0]);
});

app.delete("/api/companies/:id", async (req, res) => {
  await pool.query("DELETE FROM companies WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

// ---------- 모집 기록 ----------

// 전체 기록 (대시보드 통계 계산용)
app.get("/api/records", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM recruit_records ORDER BY recruit_date DESC");
  res.json(rows);
});

app.get("/api/companies/:id/records", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM recruit_records WHERE company_id = $1 ORDER BY recruit_date DESC",
    [req.params.id]
  );
  res.json(rows);
});

app.post("/api/companies/:id/records", async (req, res) => {
  const { id } = req.params;
  const { recruit_date, count } = req.body;
  if (!recruit_date || !count || count <= 0) {
    return res.status(400).json({ error: "날짜와 모집 인원을 확인하세요." });
  }

  // 같은 날짜 기록이 있으면 합산, 없으면 새로 생성
  const existing = await pool.query(
    "SELECT * FROM recruit_records WHERE company_id = $1 AND recruit_date = $2",
    [id, recruit_date]
  );

  let result;
  if (existing.rows.length > 0) {
    result = await pool.query(
      "UPDATE recruit_records SET count = count + $1 WHERE id = $2 RETURNING *",
      [count, existing.rows[0].id]
    );
  } else {
    result = await pool.query(
      "INSERT INTO recruit_records (company_id, recruit_date, count) VALUES ($1, $2, $3) RETURNING *",
      [id, recruit_date, count]
    );
  }
  res.status(201).json(result.rows[0]);
});

app.delete("/api/records/:id", async (req, res) => {
  await pool.query("DELETE FROM recruit_records WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
