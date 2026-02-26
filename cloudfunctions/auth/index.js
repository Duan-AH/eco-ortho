// cloudfunctions/auth/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const routes = {
  ping: require('./actions/ping'),
  whoami: require('./actions/whoami'),
  requireAdmin: require('./actions/requireAdmin'),
  requireSuperAdmin: require('./actions/requireSuperAdmin'),
  login: require('./actions/login'),
  submitAdminRequest: require('./actions/submitAdminRequest')
}

exports.main = async (event = {}, context) => {
  try {
    const { action, ...data } = event
    if (!action) return { ok: false, code: 'BAD_ACTION', error: 'Missing action' }

    const handler = routes[action]
    if (!handler) return { ok: false, code: 'BAD_ACTION', error: `Unknown action: ${action}` }

    const out = await handler({ data, event, context })

    // ✅ action 若已返回 { ok: ... } 则原样返回（避免被二次包裹）
    if (out && typeof out === 'object' && ('ok' in out)) return out

    return { ok: true, ...(out || {}) }
  } catch (e) {
    return { ok: false, code: e.code || 'INTERNAL', error: e.message || 'Internal error' }
  }
}