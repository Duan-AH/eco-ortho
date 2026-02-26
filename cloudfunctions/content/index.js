// cloudfunctions/<module>/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const routes = {
  ping: require('./actions/ping'),
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

    // handler 返回普通对象：{ pong: true, ... }
    const result = await handler({ data, event, context })
    return { ok: true, ...(result || {}) }
  } catch (e) {
    return {
      ok: false,
      code: e.code || 'INTERNAL',
      error: e.message || 'Internal error',
    }
  }
}