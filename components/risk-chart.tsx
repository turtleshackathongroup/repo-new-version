"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { RiskItem } from "@/types"

interface RiskChartProps {
  risks: RiskItem[]
}

export function RiskChart({ risks }: RiskChartProps) {
  const chartData = risks.map((risk) => ({
    name: risk.label,
    probability: risk.probability * 100,
  }))

  return (
    null
  )
}
