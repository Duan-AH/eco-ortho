// cloudfunctions/auth/actions/submitAdminRequest.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// event: { note?: string }
module.exports = async ({ data, event }) => {
  const { OPENID } = cloud.getWXContext()

  // 兼容两种取值：data.note（来自 auth 路由解包）或 event.note
  const note = (((data && data.note) ?? (event && event.note) ?? '') + '').trim()

  // 如果已经是管理员，就不需要申请
  const isAdmin = await db.collection('admins').where({ openid: OPENID }).get()
  if (isAdmin.data.length > 0) {
    return { ok: true, msg: 'already admin' }
  }

  // 如果已经申请过且未处理，就不重复写
  const existing = await db.collection('admin_requests').where({
    openid: OPENID,
    status: 'pending'
  }).get()

  if (existing.data.length > 0) {
    return { ok: true, msg: 'already requested' }
  }

  // 写入申请
  const addRes = await db.collection('admin_requests').add({
    data: {
      openid: OPENID,
      note,
      status: 'pending', // pending / approved / rejected
      createdAt: Date.now()
    }
  })

  return { ok: true, id: addRes._id }
}