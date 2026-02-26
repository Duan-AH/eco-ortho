const { callFn } = require('../../api/call')

Page({
  data: {
    loading: true,
    ok: false,
    error: '',
    total: 0,
    records: [],
    adminRole: null,
    refresherTriggered: false
  },

  onLoad() {
    this.refresh()
    callFn('auth', { action: 'whoami' })
    .then(rr => {
      this.setData({
        isAdmin: !!rr.isAdmin,
        adminRole: rr.role || null
      })
    })
    .catch(err => console.error(err))  },

  refresh() {
    this.setData({ loading: true, error: '' })

    return callFn('records', { action: 'admin.list' })
      .then(r => {
        this.setData({
          loading: false,
          ok: true,
          error: '',
          total: r.total || 0,
          records: r.records || []
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false,
          ok: false,
          error: err.message || '调用失败',
          total: 0,
          records: []
        })
      })
  },

  onDelete(e) {
    const recordId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除？',
      content: '删除后不可恢复',
      success: (r) => {
        if (!r.confirm) return

        callFn('records', { action: 'admin.delete', recordId })
          .then(() => {
            wx.showToast({ title: '已删除' })
            this.refresh()
          })
          .catch(err => {
            console.error(err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          })
      }
    })
  },


  // ⚠️ 所有管理员都可执行（建议后续收紧权限，但这步先不动业务）
  onDeleteAll() {
    wx.showModal({
      title: '危险操作',
      content: '确认要删除全部记录吗？此操作不可恢复。',
      confirmText: '继续',
      success: (r1) => {
        if (!r1.confirm) return

        wx.showModal({
          title: '再次确认',
          content: '请确认：真的要清空全部数据？',
          confirmText: '删除',
          success: (r2) => {
            if (!r2.confirm) return

            wx.showLoading({ title: '删除中...' })
            callFn('records', { action: 'admin.deleteAll', confirm: 'DELETE_ALL' })
              .then(rr => {
                wx.hideLoading()
                wx.showToast({ title: `已删除 ${rr.deleted || 0} 条`, icon: 'none' })
                this.refresh()
              })
              .catch(err => {
                wx.hideLoading()
                console.error(err)
                wx.showToast({ title: err.message || '删除失败', icon: 'none' })
              })
          }
        })
      }
    })
  },

  onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
    Promise.resolve(this.refresh()).finally(() => {
      this.setData({ refresherTriggered: false })
    })
  },

  goAdminManage() {
    wx.navigateTo({ url: '/pages/adminManage/adminManage' })
  }
})