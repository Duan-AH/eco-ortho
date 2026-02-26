module.exports = async (event, ctx) => {
  const targetOpenid = String(event.openid || '').trim()
  if (!targetOpenid) throw new Error('openid is required')

  // 防止删自己（原逻辑）
  if (targetOpenid === ctx.OPENID) throw new Error('cannot remove yourself')

  const found = await ctx.db.collection('admins').where({ openid: targetOpenid }).get()
  if (!found.data || found.data.length === 0) return { msg: 'not admin' }

  await ctx.db.collection('admins').doc(found.data[0]._id).remove()
  return {}
}