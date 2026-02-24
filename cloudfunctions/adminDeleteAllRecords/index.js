const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 清空 user_records（硬删除）
 * event: { confirm?: string }
 * - confirm 建议前端传固定字符串，避免误触（例如 'DELETE_ALL'）
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 1) 管理员校验（沿用你现有模式）
  const adminRes = await db.collection('admins').where({ openid: OPENID }).get()
  if (!adminRes.data || adminRes.data.length === 0) {
    return { ok: false, error: 'Permission denied' }
  }

  // 2) 可选：强制二次确认（强烈建议）
  if ((event?.confirm || '') !== 'DELETE_ALL') {
    return { ok: false, error: 'Confirm required' }
  }

  // 3) 分批删除（避免 where().remove() 的单次限制/不确定性）
  const MAX_LIMIT = 100
  let deleted = 0

  while (true) {
    // 每次取一批 _id
    const res = await db.collection('user_records')
      .field({ _id: true })
      .limit(MAX_LIMIT)
      .get()

    const batch = res.data || []
    if (batch.length === 0) break

    // 并发删除这一批
    await Promise.all(
      batch.map(r => db.collection('user_records').doc(r._id).remove())
    )
    deleted += batch.length
  }

  return { ok: true, deleted }
}