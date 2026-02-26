const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const routes = {
  list: require('./actions/list'),
  listRequests: require('./actions/listRequests'),
  approveRequest: require('./actions/approveRequest'),
  rejectRequest: require('./actions/rejectRequest'),
  add: require('./actions/add'),
  updateRole: require('./actions/updateRole'),
  updateRemark: require('./actions/updateRemark'),
  remove: require('./actions/remove')
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext()
    const { OPENID } = wxContext

    const action = event && event.action
    if (!action) return { ok: false, error: 'action required' }

    // ✅ 1) 必须是 super_admin（完全复刻 superManageAdmins 的行为）
    const me = await db.collection('admins').where({ openid: OPENID }).get()
    const myRole = me.data && me.data[0] && (me.data[0].role || 'admin')
    if (!me.data.length || myRole !== 'super_admin') {
      return { ok: false, error: 'Permission denied' }
    }

    const handler = routes[action]
    if (!handler) return { ok: false, error: 'unknown action' }

    // ctx 里放常用对象，actions 直接用
    const ctx = { cloud, db, wxContext, OPENID }

    const data = await handler(event, ctx) // actions 返回普通对象
    return { ok: true, ...(data || {}) }
  } catch (e) {
    return { ok: false, error: e.message || String(e), code: e.code || 'ERR' }
  }
}