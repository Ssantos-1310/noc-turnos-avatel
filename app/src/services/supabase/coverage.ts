import { sb } from './client'
import type { CoverageService } from '../index'
import type { CoverageRule } from '../../types'

const coverageService: CoverageService = {
  async getRules() {
    const { data } = await sb.from('coverage_rules').select('*').order('sort_order')
    return (data ?? []) as CoverageRule[]
  },
  async saveRule(rule) {
    const { error } = await sb.from('coverage_rules').upsert(rule)
    if (error) throw error
  },
  async deleteRule(id) {
    const { error } = await sb.from('coverage_rules').delete().eq('id', id)
    if (error) throw error
  },
}

export default coverageService
