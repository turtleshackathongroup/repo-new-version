"use client"

import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"
import { Cloud, Database } from "lucide-react"

interface HeaderProps {
  mockMode: boolean
  onMockModeChange: (enabled: boolean) => void
}

export function Header({ mockMode, onMockModeChange }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Cloud className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">WeatherRisk</h1>
              <p className="text-xs text-muted-foreground">Extreme Weather Assessment Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={mockMode ? "default" : "outline"}
              size="sm"
              onClick={() => onMockModeChange(!mockMode)}
              className="gap-2"
            >
              <Database className="w-4 h-4" />
              {mockMode ? "Mock Data" : "Live API"}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
