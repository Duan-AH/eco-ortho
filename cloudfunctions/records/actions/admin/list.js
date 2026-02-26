const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const { requireAdmin } = require('../../_shared/guard')

function toMs(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const s = v.trim()
    if (/^\d+$/.test(s)) {
      const n = Number(s)
      if (Number.isFinite(n)) return n
    }
    const d = new Date(s)
    const t = d.getTime()
    if (!Number.isNaN(t)) return t
  }
  return 0
}

module.exports = async () => {
  // ✅ 统一权限：无分支 return Permission denied
  await requireAdmin()

  const MAX_LIMIT = 100
  const countRes = await db.collection('user_records').count()
  const total = countRes.total

  let records = []
  for (let i = 0; i < total; i += MAX_LIMIT) {
    const res = await db.collection('user_records')
      .skip(i)
      .limit(MAX_LIMIT)
      .get()
    records = records.concat(res.data || [])
  }

  const normalized = records.map(r => {
    const ms = toMs(r && r.createdAtMs) || toMs(r && r.createdAt) || 0
    return { ...r, createdAtMsNormalized: ms }
  })

  normalized.sort((a, b) => (b.createdAtMsNormalized || 0) - (a.createdAtMsNormalized || 0))

  return { ok: true, total, records: normalized }
}