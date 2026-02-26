module.exports = async (event, ctx) => {
  const targetOpenid = String(event.openid || '').trim()
  if (!targetOpenid) throw new Error('openid is required')

  const role = String(event.role || '').trim()
  if (!['admin', 'super_admin'].includes(role)) throw new Error('invalid role')

  const found = await ctx.db.collection('admins').where({ openid: targetOpenid }).get()
  if (!found.data || found.data.length === 0) throw new Error('target not found')

  await ctx.db.collection('admins').doc(found.data[0]._id).update({
    data: { role }
  })
  return {}
}