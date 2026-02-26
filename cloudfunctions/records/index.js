// cloudfunctions/records/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const routes = {
  ping: require('./actions/ping'),
  save: require('./actions/save'),

  'admin.list': require('./actions/admin/list'),
  'admin.delete': require('./actions/admin/delete'),
  'admin.deleteAll': require('./actions/admin/deleteAll'),
  'admin.exportExcel': require('./actions/admin/exportExcel'),
  'admin.importExcel': require('./actions/admin/importExcel'),
}

exports.main = async (event = {}, context) => {
  try {
    const { action, ...data } = event

    if (!action) {
      return { ok: false, code: 'BAD_ACTION', error: 'Missing action' }
    }

    const handler = routes[action]
    if (!handler) {
      return { ok: false, code: 'BAD_ACTION', error: `Unknown action: ${action}` }
    }

    const out = await handler({ data, event, context })

    // ✅ 关键：如果 action 自己已经返回了 { ok: ... }，就原样返回
    if (out && typeof out === 'object' && ('ok' in out)) {
      return out
    }

    // 否则按模块统一包一层 ok:true
    return { ok: true, ...(out || {}) }
  } catch (e) {
    return {
      ok: false,
      code: e.code || 'INTERNAL',
      error: e.message || 'Internal error',
      detail: e.detail
    }
  }
}