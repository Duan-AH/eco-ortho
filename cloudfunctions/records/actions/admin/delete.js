const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const { requireAdmin } = require('../../_shared/guard')

module.exports = async ({ data }) => {
  const { recordId } = data || {}
  if (!recordId) return { ok: false, error: 'recordId is required' }

  await requireAdmin()

  await db.collection('user_records').doc(recordId).remove()
  return { ok: true, recordId }
}