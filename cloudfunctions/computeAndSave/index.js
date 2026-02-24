// cloudfunctions/computeAndSave/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database() // ✅ 必须定义 db

const { computeResult, COMPUTE_VERSION } = require('./_shared/compute')
const { processInput } = require('./_shared/inputProcessor')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // ✅ 兜底1：inputs 形状兜底（不做纠错/校验，只防止 inputs 不是对象导致异常/脏行为）
  const rawInputs =
    event.inputs && typeof event.inputs === 'object' && !Array.isArray(event.inputs)
      ? event.inputs
      : {}

  const rawBrandIndex = event.brandIndex
  const rawAgeIndex = event.ageIndex

  // ✅ 统一输入处理（实验版：不拦截，只归一化 + issues）
  const processed = processInput({
    inputs: rawInputs,
    brandIndex: rawBrandIndex,
    ageIndex: rawAgeIndex,
    ctx: { mode: 'ui', source: 'miniprogram' }
  })

  // ✅ 统一计算：只吃标准化后的 inputs
  let result
  try {
    result = computeResult(processed.inputs, processed.brandIndex, processed.ageIndex)
  } catch (e) {
    // 计算本身失败：仍然返回失败（这是“系统错误”，不是“输入错误处理”）
    return { ok: false, error: '计算失败', detail: e?.message || String(e) }
  }

  if (!result || !result.ready) {
    // 计算未就绪：保持你当前语义（不做输入纠错）
    return { ok: false, error: '计算参数不完整' }
  }

  const now = Date.now()

  // 写库文档（保持实验策略：不额外校验/纠错）
  const doc = {
    openid: wxContext.OPENID,

    inputs: processed.inputs,
    brandIndex: processed.brandIndex,
    ageIndex: processed.ageIndex,
    result,

    inputIssues: processed.issues || [],
    inputPatched: !!processed.patched,
    inputVersion: processed.inputVersion,
    computeVersion: COMPUTE_VERSION,

    createdAtMs: now,
    createdAt: now,
    updatedAt: now,
    version: 'v2'
  }

  // ✅ 兜底2：写库失败降级——仍返回 result（不影响实验观察）
  try {
    const addRes = await db.collection('user_records').add({ data: doc })
    return {
      ok: true,
      saved: true,
      recordId: addRes?._id,
      result
    }
  } catch (e) {
    return {
      ok: true,
      saved: false,
      result,
      error: '写入失败',
      detail: e?.message || String(e)
    }
  }
}