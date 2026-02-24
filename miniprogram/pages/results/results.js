Page({
  data: {
    result: {
      ready: false,
      total_g: '0.000',
      total_kg: '0.000',
      categorySums: [],
      rows: []
    },
    metaText: '',
    formula: {
      travel: 'C_travel = 0'
    }
  },

  onLoad() {
    const res = wx.getStorageSync('calc_result');
    if (res && res.ready) {
      this.setData({ result: res });
    }

    const meta = wx.getStorageSync('calc_meta') || {}
    const brandIndex = Number(meta.brandIndex ?? 0)
    const ageIndex = Number(meta.ageIndex ?? 0)

    const brandLabel = brandIndex === 1 ? '隐适美' : '时代天使'
    const ageLabel = ageIndex === 1 ? '已结束' : '未结束'

    this.setData({
      metaText: `替牙期：${ageLabel}  ｜  品牌：${brandLabel}`
    })

    // 从缓存读取输入，用于展示公式变量（尤其交通）
    // 你需要在 index.js 计算后也把 inputs 存一份（见下方说明）
    const inputs = wx.getStorageSync('calc_inputs');
    const formula = { travel: 'C_travel = 0' };

    if (inputs && Number.isFinite(inputs.x)) {
      const x = Number(inputs.x) || 0;

      // travelModeIndex: 0不计 1油车 2电车 3公交 4地铁
      const mode = Number(inputs.travelModeIndex ?? 0);

      if (mode === 0) {
        formula.travel = 'C_travel = 0（不计交通）';
      } else if (mode === 4) {
        const st = Number(inputs.travel_station_roundtrip) || 0;
        formula.travel = `C_travel = 100×(S_rt×x) = 100×(${st}×${x})`;
      } else {
        const km = Number(inputs.travel_km_roundtrip) || 0;
        const ef = mode === 1 ? 240 : mode === 2 ? 60 : 10;
        const name = mode === 1 ? '油车' : mode === 2 ? '电车' : '公交/电瓶车';
        formula.travel = `C_travel = ${ef}×(D_rt×x) = ${ef}×(${km}×${x})  （${name}，单位g/km）`;
      }
    }

    this.setData({ formula });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  copyReport() {
    const r = this.data.result;
    if (!r.ready) return;

    const lines = [];
    lines.push(`绿碳正畸计算结果`);
    lines.push(`总排放：${r.total_g} gCO₂（≈ ${r.total_kg} kgCO₂）`);
    lines.push(``);
    lines.push(`计算公式：C_total = Σ(g_i×count_i)`);
    lines.push(``);
    lines.push(`按分类汇总：`);
    (r.categorySums || []).forEach(it => lines.push(`- ${it.category}：${it.g} g`));
    lines.push(``);
    lines.push(`明细：`);
    (r.rows || []).forEach(it => lines.push(`- ${it.name}｜次数 ${it.count}｜${it.g} g`));

    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  onShareAppMessage() {
    const r = this.data.result;
    if (!r.ready) {
      return { title: '绿碳正畸计算器', path: '/pages/index/index' };
    }
    return {
      title: `我的正畸碳排放：${r.total_kg} kgCO₂`,
      path: '/pages/index/index'
    };
  }
});
