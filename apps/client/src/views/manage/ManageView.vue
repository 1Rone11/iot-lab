<template>
  <section class="health">
    <header class="health__header">
      <h1 class="health__title">控制台</h1>
      <button class="health__btn" type="button" :disabled="loading" @click="check">
        {{ loading ? '检查中…' : '重新检查' }}
      </button>
    </header>

    <p v-if="loading" class="health__state">正在请求 GET /health…</p>

    <div v-else-if="error" class="panel panel--error">
      <p class="panel__headline">{{ error.describe() }}</p>
      <dl class="meta">
        <div v-if="error.status" class="meta__row">
          <dt>HTTP 状态</dt>
          <dd>{{ error.status }}</dd>
        </div>
        <div v-if="error.code" class="meta__row">
          <dt>错误码</dt>
          <dd>{{ error.code }}</dd>
        </div>
        <div v-if="error.requestId" class="meta__row">
          <dt>requestId</dt>
          <dd class="mono">{{ error.requestId }}</dd>
        </div>
        <div v-if="error.isTransportFailure" class="meta__row">
          <dt>诊断</dt>
          <dd>请求没到达后端，先在终端确认 api 服务已启动</dd>
        </div>
      </dl>
    </div>

    <div v-else-if="health" class="panel">
      <p class="panel__headline"><span class="dot" aria-hidden="true"></span>服务正常</p>
      <dl class="meta">
        <div class="meta__row">
          <dt>status</dt>
          <dd>{{ health.status }}</dd>
        </div>
        <div class="meta__row">
          <dt>已运行</dt>
          <dd>{{ uptimeText }}</dd>
        </div>
        <div class="meta__row">
          <dt>version</dt>
          <dd>{{ health.version }}</dd>
        </div>
        <div class="meta__row">
          <dt>timestamp</dt>
          <dd>{{ timestampText }}</dd>
        </div>
      </dl>
    </div>

    <p v-else class="health__state">尚未检查</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getHealth } from '@/api/health'
import { HttpError } from '@/api/http'
import type { HealthResponse } from '@/api/types'

/**
 * 三个 ref 对应三种互斥的界面状态，而不是用一个 loading + data 混着推断。
 * 显式状态的好处：不会出现「loading 结束、data 是 null、error 也是 null」这种无法解释的空白。
 */
const health = ref<HealthResponse | null>(null)
const error = ref<HttpError | null>(null)
// 初始为 true：首帧渲染发生在 mounted 之前，若初始为 false 会先闪一下"尚未检查"
const loading = ref(true)

const uptimeText = computed(() => {
  const total = health.value?.uptimeSec
  if (total === undefined) return ''
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours} 小时 ${minutes} 分 ${seconds} 秒`
  if (minutes > 0) return `${minutes} 分 ${seconds} 秒`
  return `${seconds} 秒`
})

const timestampText = computed(() => {
  const iso = health.value?.timestamp
  if (!iso) return ''
  const date = new Date(iso)
  // 后端给的是 UTC ISO 串，这里按用户本地时区渲染——时区转换是客户端的责任
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('zh-CN', { hour12: false })
})

async function check(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    health.value = await getHealth()
  } catch (thrown) {
    health.value = null
    if (thrown instanceof HttpError) {
      error.value = thrown
    } else {
      // 走到这里说明不是网络问题而是代码 bug（比如序列化异常），不能静默吞掉
      console.error('[health] 非预期异常', thrown)
      error.value = new HttpError({ kind: 'unknown', message: 'Unexpected error', original: thrown })
    }
  } finally {
    // 放 finally 而不是 try/catch 两边都写：无论成功失败都必须解除 loading
    loading.value = false
  }
}

onMounted(check)
</script>

<style scoped lang="less">
// 项目还没有设计系统，先写死中性色；
// 等 console 页面多起来再抽到全局 less 变量 + prefers-color-scheme。
.health {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 24px;
  color: #1f2328;
  font-size: 14px;
  line-height: 1.6;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 500;
  }

  &__btn {
    padding: 6px 14px;
    font: inherit;
    color: #1f2328;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #eef1f4;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  &__state {
    margin: 0;
    color: #636c76;
  }
}

.panel {
  padding: 16px 18px;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;

  &--error {
    background: #fff5f5;
    border-color: #ffcecb;
  }

  &__headline {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    font-weight: 500;
  }
}

.dot {
  width: 8px;
  height: 8px;
  background: #1a7f37;
  border-radius: 50%;
}

.meta {
  display: grid;
  gap: 8px;
  margin: 0;

  &__row {
    display: grid;
    grid-template-columns: 92px 1fr;
    gap: 12px;
  }

  dt {
    color: #636c76;
  }

  dd {
    margin: 0;
    word-break: break-all;
  }
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
</style>
