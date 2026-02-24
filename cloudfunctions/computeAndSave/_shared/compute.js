// 复制件，需同步版本！
const COMPUTE_VERSION = 'compute_v2_2026-02-24'

function safeInt(v, def = 0) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : def
}
function safeNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}
function fmt(num) {
  const n = Number(num)
  if (!Number.isFinite(n)) return '0.000'
  return n.toFixed(3)
}

function getAlignerFactor(brandIndex, ageIndex) {
  // brandIndex: 0=时代天使 1=隐适美（前端用 0/1）
  // ageIndex:   0=未结束   1=已结束（前端用 0/1）
  const table = {
    '0_0': 11.0147,
    '0_1': 10.4872,
    '1_0': 12.7012,
    '1_1': 14.8202
  }
  return table[`${brandIndex}_${ageIndex}`]
}

function add(rows, catSum, category, name, count, gPerUnit) {
  const c = Number(count)
  const g = Number(gPerUnit) * c
  rows.push({ category, name, count: fmt(c), g: fmt(g) })
  catSum[category] = (catSum[category] || 0) + g
  return g
}

function computeTravel(inputs, rows, catSum, x) {
  // travelModeIndex（前端）：0不计算 1油车 2电车 3公交/电瓶车 4地铁
  const mode = safeInt(inputs.travelModeIndex, 0)

  if (mode === 0) {
    add(rows, catSum, '交通碳排放', '交通（不计）', 0, 0)
    return 0
  }

  let g = 0
  if (mode === 1) {
    const km = safeNumber(inputs.travel_km_roundtrip)
    g = 240 * km * x
    rows.push({ category: '交通碳排放', name: '私家车（油）', count: fmt(km * x) + ' km', g: fmt(g) })
  } else if (mode === 2) {
    const km = safeNumber(inputs.travel_km_roundtrip)
    g = 60 * km * x
    rows.push({ category: '交通碳排放', name: '私家车（电）', count: fmt(km * x) + ' km', g: fmt(g) })
  } else if (mode === 3) {
    const km = safeNumber(inputs.travel_km_roundtrip)
    g = 10 * km * x
    rows.push({ category: '交通碳排放', name: '公交车/电瓶车', count: fmt(km * x) + ' km', g: fmt(g) })
  } else if (mode === 4) {
    const st = safeInt(inputs.travel_station_roundtrip)
    g = 100 * st * x
    rows.push({ category: '交通碳排放', name: '地铁（每站）', count: fmt(st * x) + ' 站', g: fmt(g) })
  }

  catSum['交通碳排放'] = (catSum['交通碳排放'] || 0) + g
  return g
}

// inputs：就是首页 inputs 那一套
// brandIndex/ageIndex：前端用 0/1
function computeResult(inputs, brandIndex, ageIndex) {
  const inps = inputs || {}

  const n = safeInt(inps.n)
  const x = safeInt(inps.x)
  const k = safeInt(inps.k, 8)

  const rows = []
  const catSum = {}
  let total = 0

  // —— 影像学 ——
  total += add(rows, catSum, '影像学检验', '全景片', (n + 1), 2.98)
  total += add(rows, catSum, '影像学检验', 'CBCT', n, 6.86)
  total += add(rows, catSum, '影像学检验', '头颅侧位片', (n + 1), 1.49)
  total += add(rows, catSum, '影像学检验', '正位片', n, 1.49)
  total += add(rows, catSum, '影像学检验', '正畸人像照（一套6张）', n, 0.045)
  total += add(rows, catSum, '影像学检验', '口内照摄影（一套6张）', (n + 1), 0.045)

  // —— 实验室/洗牙（次数）——
  total += add(rows, catSum, '实验室检验', '血常规＋传染病四项', safeInt(inps.lab_blood_count), 770)
  total += add(rows, catSum, '洗牙', '洗牙', safeInt(inps.cleaning_count), 1250)

  // —— 牙套/粘接材料 ——
  const alignerFactor = getAlignerFactor(brandIndex, ageIndex)
  total += add(rows, catSum, '牙套（算运输）', '牙套（每套）', (k * x), alignerFactor)
  total += add(rows, catSum, '粘接材料（同牙套）', '粘接材料（每套）', k, alignerFactor)

  // —— 一次性耗材 ——
  total += add(rows, catSum, '一次性医疗耗材', '无菌手套', x, 65)
  total += add(rows, catSum, '一次性医疗耗材', '医用口罩（分摊0.1x）', 0.1 * x, 19.2)
  total += add(rows, catSum, '一次性医疗耗材', '口镜（每患者1个）', 1, 91.66)
  total += add(rows, catSum, '一次性医疗耗材', '吸唾管', x, 45)
  total += add(rows, catSum, '一次性医疗耗材', '消毒棉球（1颗，2x）', 2 * x, 6.45)

  total += add(rows, catSum, '一次性医疗耗材', '舌侧扣（一个）', safeInt(inps.lingual_button_count), 6)
  total += add(rows, catSum, '一次性医疗耗材', '支抗钉（一个）', safeInt(inps.miniscrew_count), 15)

  // —— 交通 ——
  total += computeTravel(inps, rows, catSum, x)

  // —— 科室用电：每次复诊固定 1 小时 ——
  total += add(rows, catSum, '科室用电', '科室用电（每次按1小时）', 1 * x, 330)

  // —— 正畸附件 ——
  const elasticTotal = safeInt(inps.elastic_per_day) * safeInt(inps.elastic_days)
  total += add(rows, catSum, '正畸附件', '正畸皮筋（0.75g/条）', elasticTotal, 0.75)
  total += add(rows, catSum, '正畸附件', '牙套收纳盒（70g/个）', safeInt(inps.case_box, 1), 70)
  total += add(rows, catSum, '正畸附件', '咬胶（55g/个）', safeInt(inps.chewie, 1), 55)

  const categorySums = Object.keys(catSum)
    .map(cat => ({ category: cat, g: fmt(catSum[cat]) }))
    .sort((a, b) => Number(b.g) - Number(a.g))

  return {
    ready: true,
    total_g: fmt(total),
    total_kg: fmt(total / 1000),
    categorySums,
    rows: rows.filter(r => Number(r.g) !== 0)
  }
}

module.exports = { computeResult }

module.exports = { computeResult, COMPUTE_VERSION }