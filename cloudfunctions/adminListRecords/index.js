const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function toMs(v) {
  // number 毫秒
  if (typeof v === 'number' && Number.isFinite(v)) return v

  // 纯数字字符串（毫秒）
  if (typeof v === 'string') {
    const s = v.trim()
    if (/^\d+$/.test(s)) {
      const n = Number(s)
      if (Number.isFinite(n)) return n
    }
    // ISO 字符串
    const d = new Date(s)
    const t = d.getTime()
    if (!Number.isNaN(t)) return t
  }

  return 0
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 1) 权限校验：必须是管理员
  const adminRes = await db.collection('admins').where({
    openid: wxContext.OPENID
  }).get()

  if (!adminRes.data || adminRes.data.length === 0) {
    return {
      ok: false,
      error: 'Permission denied',
      debug_openid: wxContext.OPENID,
      debug_appid: wxContext.APPID
    }
  }

  // 2) 拉全表（分页）
  const MAX_LIMIT = 100
  const countRes = await db.collection('user_records').count()
  const total = countRes.total

  let records = []
  for (let i = 0; i < total; i += MAX_LIMIT) {
    // 注意：这里先不强依赖数据库排序（旧数据可能没有 createdAtMs）
    const res = await db.collection('user_records')
      .skip(i)
      .limit(MAX_LIMIT)
      .get()
    records = records.concat(res.data || [])
  }

  // 3) 统一生成 createdAtMsNormalized（永远是毫秒数）
  const normalized = records.map(r => {
    const ms =
      toMs(r && r.createdAtMs) ||
      toMs(r && r.createdAt) ||
      0

    return {
      ...r,
      createdAtMsNormalized: ms
    }
  })

  // 4) 最终稳定排序：按毫秒倒序（最新在前）
  normalized.sort((a, b) => (b.createdAtMsNormalized || 0) - (a.createdAtMsNormalized || 0))

  return {
    ok: true,
    total,
    records: normalized
  }
}