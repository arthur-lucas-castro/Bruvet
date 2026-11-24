import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toQueryString } from '../../lib/pagination'
import type { PaymentMethod } from '../billing/billing-api'
import type { Species } from '../patients/species'

export type FinanceRow = {
  id: string
  name: string
  revenueCents: number
  costCents: number
  marginCents: number
  count: number
}

export type FinanceSummary = {
  period: { from: string; until: string; granularity: 'dia' | 'mes' }
  kpis: {
    revenueCents: number
    receivedCents: number
    receivableCents: number
    receivableBills: number
    oldestOpenBillAt: string | null
    directCostCents: number
    medicationCostCents: number
    procedureCostCents: number
    grossMarginCents: number
    grossMarginPercent: number | null
    attendances: number
    averageTicketCents: number
    discountCents: number
    lossCostCents: number
    internalUseCostCents: number
  }
  series: { key: string; revenueCents: number; costCents: number; receivedCents: number }[]
  categories: FinanceRow[]
  topProcedures: FinanceRow[]
  veterinarians: FinanceRow[]
  species: (FinanceRow & { id: Species })[]
  paymentMethods: { method: PaymentMethod; amountCents: number }[]
  discounts: {
    attendanceId: string
    attendanceCode: number
    patientName: string
    amountCents: number
    reason: string | null
    by: string | null
    at: string | null
  }[]
  stock: { valueCents: number; expiredValueCents: number; batchesWithoutCost: number }
  dataQuality: { proceduresWithoutCost: number; medicationsWithoutCost: number }
}

export function useFinanceSummary(range: { from: string; until: string }) {
  return useQuery({
    queryKey: ['finance', 'summary', range],
    queryFn: () => api.get<FinanceSummary>(`/finance/summary${toQueryString(range)}`),
    placeholderData: keepPreviousData,
  })
}
