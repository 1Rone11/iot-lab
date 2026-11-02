import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('renders navigation links for both routes', () => {
    const wrapper = mount(App, {
      global: {
        // 单元测试不挂真实 router，用桩替换掉 router-link / router-view
        stubs: { RouterLink: true, RouterView: true },
      },
    })

    // 导航应包含两个入口：项目主页 与 控制台
    expect(wrapper.findAll('router-link-stub')).toHaveLength(2)
  })
})
