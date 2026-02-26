const { callFn } = require('../../api/call')

Page({
  data: {
    note: '',
    loading: false,
    statusText: ''
  },

  onInputNote(e) {
    this.setData({ note: e.detail.value })
  },

  onSubmit() {
    if (this.data.loading) return
    this.setData({ loading: true, statusText: '' })

    callFn('auth', { action: 'submitAdminRequest', note: this.data.note })
    .then(r => {
      let msg = '提交成功，等待审核'
      if (r.msg === 'already requested') msg = '你已提交过申请，请等待审核'
      if (r.msg === 'already admin') msg = '你已经是管理员了'
      this.setData({ loading: false, statusText: msg })
      wx.showToast({ title: '已提交', icon: 'none' })
    })
    .catch(err => {
      console.error(err)
      this.setData({ loading: false, statusText: '提交失败，请稍后重试' })
      wx.showToast({ title: '提交失败', icon: 'none' })
    })
  }
})