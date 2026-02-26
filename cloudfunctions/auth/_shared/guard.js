// cloudfunctions/auth/_shared/guard.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function getAdminDoc(openid) {
  const res = await db.collection('admins').where({ openid }).limit(1).get()
  if (!res.data || res.data.length === 0) return null
  return res.data[0]
}

// ✅ 严格对齐你原 checkAdmin 的判定：存在即 admin；role 缺省为 'admin'
async function getAdminInfo(openid) {
  const doc = await getAdminDoc(openid)
  if (!doc) return { isAdmin: false, role: null, doc: null }
  return { isAdmin: true, role: doc.role || 'admin', doc }
}

async function requireAdmin(openid) {
  const info = await getAdminInfo(openid)
  if (!info.isAdmin) {
    const err = new Error('Permission denied')
    err.code = 'NO_ADMIN'
    throw err
  }
  return info
}

async function requireSuperAdmin(openid) {
  const info = await requireAdmin(openid)
  if (info.role !== 'super_admin') {
    const err = new Error('Permission denied')
    err.code = 'NO_SUPER_ADMIN'
    throw err
  }
  return info
}

module.exports = {
  getAdminInfo,
  requireAdmin,
  requireSuperAdmin
}