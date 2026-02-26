// cloudfunctions/records/_shared/guard.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function getAdminDoc(openid) {
  const r = await db.collection('admins').where({ openid }).limit(1).get()
  return (r.data && r.data[0]) || null
}

// ✅ 严格对齐原 checkAdmin：存在即 admin；role 缺省 'admin'
async function getAdminInfo(openid) {
  const doc = await getAdminDoc(openid)
  if (!doc) return { isAdmin: false, role: null, doc: null }
  return { isAdmin: true, role: doc.role || 'admin', doc }
}

// ✅ 统一：权限不足就 throw，并统一 err.code
function throwPermissionDenied(detail) {
  const err = new Error('Permission denied')
  err.code = 'PERMISSION_DENIED'
  err.detail = detail
  throw err
}

// ✅ 统一入口：必须是管理员（admins 有记录）
async function requireAdmin() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const appid = wxContext.APPID

  const info = await getAdminInfo(openid)
  if (!info.isAdmin) {
    throwPermissionDenied({
      reason: 'NO_ADMIN',
      openid,
      appid
    })
  }
  return { ...info, openid, appid }
}

// ✅ 统一入口：必须是管理员且 role 在允许列表（用于 import）
async function requireAdminRoles(allowedRoles) {
  const info = await requireAdmin()
  const role = info.role || 'admin'

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      throwPermissionDenied({
        reason: 'ROLE_NOT_ALLOWED',
        openid: info.openid,
        appid: info.appid,
        role,
        allowedRoles
      })
    }
  }
  return { ...info, role }
}

// ✅ 超管（如你以后需要）
async function requireSuperAdmin() {
  return requireAdminRoles(['super_admin'])
}

module.exports = {
  getAdminInfo,
  requireAdmin,
  requireAdminRoles,
  requireSuperAdmin
}