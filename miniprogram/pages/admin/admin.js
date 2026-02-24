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
    wx.cloud.callFunction({ name: 'checkAdmin' }).then(r => {
      const rr = r.result || {}
      this.setData({ adminRole: rr.role || null })
    })
  },

  refresh() {
    this.setData({ loading: true, error: '' })

    return wx.cloud.callFunction({
      name: 'adminListRecords'
    }).then(res => {
      const r = res.result || {}
      if (!r.ok) {
        this.setData({
          loading: false,
          ok: false,
          error: r.error || '加载失败',
          total: 0,
          records: []
        })
        return
      }

      this.setData({
        loading: false,
        ok: true,
        total: r.total || 0,
        records: r.records || []
      })
    }).catch(err => {
      console.error(err)
      this.setData({
        loading: false,
        ok: false,
        error: '调用失败',
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

        wx.cloud.callFunction({
          name: 'adminDeleteRecord',
          data: { recordId }
        }).then(res => {
          const rr = res.result || {}
          if (!rr.ok) {
            wx.showToast({ title: rr.error || '删除失败', icon: 'none' })
            return
          }

          wx.showToast({ title: '已删除' })
          this.refresh()
        })
      }
    })
  },

  // ⚠️ 所有管理员都可执行
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
            wx.cloud.callFunction({
              name: 'adminDeleteAllRecords',
              data: { confirm: 'DELETE_ALL' }
            }).then(res => {
              wx.hideLoading()
              const rr = res.result || {}
              if (!rr.ok) {
                wx.showToast({ title: rr.error || '删除失败', icon: 'none' })
                return
              }

              wx.showToast({ title: `已删除 ${rr.deleted || 0} 条`, icon: 'none' })
              this.refresh()
            }).catch(err => {
              wx.hideLoading()
              console.error(err)
              wx.showToast({ title: '删除失败', icon: 'none' })
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
    wx.navigateTo({
      url: '/pages/adminManage/adminManage'
    })
  }
})