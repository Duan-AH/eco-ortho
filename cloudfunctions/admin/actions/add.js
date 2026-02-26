module.exports = async (event, ctx) => {
  const targetOpenid = String(event.openid || '').trim()
  if (!targetOpenid) throw new Error('openid is required')

  const role = String(event.role || 'admin').trim()
  const remark = String(event.remark || '').trim()
  if (!['admin', 'super_admin'].includes(role)) throw new Error('invalid role')

  const exists = await ctx.db.collection('admins').where({ openid: targetOpenid }).get()
  if (exists.data && exists.data.length > 0) {
    await ctx.db.collection('admins').doc(exists.data[0]._id).update({
      data: { role, remark }
    })
    return { msg: 'updated existing', role }
  }

  const addRes = await ctx.db.collection('admins').add({
    data: { openid: targetOpenid, role, remark, createdAt: Date.now(), createdBy: ctx.OPENID }
  })
  return { id: addRes._id, role }
}