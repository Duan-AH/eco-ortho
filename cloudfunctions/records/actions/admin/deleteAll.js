const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const { requireAdmin } = require('../../_shared/guard')

module.exports = async ({ data }) => {
  await requireAdmin()

  if (((data && data.confirm) || '') !== 'DELETE_ALL') {
    return { ok: false, error: 'Confirm required' }
  }

  const MAX_LIMIT = 100
  let deleted = 0

  while (true) {
    const res = await db.collection('user_records')
      .field({ _id: true })
      .limit(MAX_LIMIT)
      .get()

    const batch = res.data || []
    if (batch.length === 0) break

    await Promise.all(batch.map(r => db.collection('user_records').doc(r._id).remove()))
    deleted += batch.length
  }

  return { ok: true, deleted }
}