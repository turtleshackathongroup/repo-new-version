import type React from "react"
import { Thermometer, Snowflake, Wind, CloudRain, Frown } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { RiskItem } from "@/types"

interface RiskCardsProps {
  risks: RiskItem[]
}

const riskIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  very_hot: Thermometer,
  very_cold: Snowflake,
  very_windy: Wind,
  very_wet: CloudRain,
  very_uncomfortable: Frown,
}

const confidenceColors: Record<string, string> = {
  high: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  medium: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  low: "bg-muted text-muted-foreground border-border",
}

export function RiskCards({ risks }: RiskCardsProps) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {risks.map((risk) => {
        const IconComponent = riskIcons[risk.type]
        return (
          <Card key={risk.type} className="p-4 bg-card border-border hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <IconComponent className="w-6 h-6 text-primary" />
              <span className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColors[risk.confidence]}`}>
                {risk.confidence}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{risk.label}</p>
              <p className="text-3xl font-bold text-foreground">{(risk.probability * 100).toFixed(0)}%</p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
