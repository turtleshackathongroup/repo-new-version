"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { QueryForm } from "@/components/query-form"
import { RiskCards } from "@/components/risk-cards"
import { RiskChart } from "@/components/risk-chart"
import { DriversTable } from "@/components/drivers-table"
import { MapPlaceholder } from "@/components/map-placeholder"
import { ExplanationPanel } from "@/components/explanation-panel"
import { Footer } from "@/components/footer"
import { Cloud } from "lucide-react"
import { TemperatureMap } from "@/components/temperature-map"
import NasaSnapshotMap from "@/app/components/NasaSnapshotMap"
import { Card } from "@/components/ui/card"
import type { ApiResponse, QueryParams } from "@/types"

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ApiResponse | null>(null)

  const handleSubmit = async (params: QueryParams) => {
    setLoading(true)
    setError(null)

    try {
      const queryString = new URLSearchParams({
        lat: params.lat.toString(),
        lon: params.lon.toString(),
        startDate: params.startDate,
        time: params.time,
        ...(params.endDate && { endDate: params.endDate }),
        unitsTemp: params.unitsTemp,
        unitsWind: params.unitsWind,
        thresholdHot: params.thresholds.hot.toString(),
        thresholdCold: params.thresholds.cold.toString(),
        thresholdWindy: params.thresholds.windy.toString(),
        thresholdWet: params.thresholds.wet.toString(),
        thresholdUncomfortable: params.thresholds.uncomfortable.toString(),
        ...(params.locationName && { locationName: params.locationName }),
      }).toString()

      const response = await fetch(`/api/assess?${queryString}`)

      if (!response.ok) {
        throw new Error("Failed to fetch weather risk assessment")
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col weather-bg">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Query Panel */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <QueryForm onSubmit={handleSubmit} loading={loading} />
          </aside>

          {/* Results Area */}
          <div className="space-y-6">
            {!results && !loading && (
              <div className="flex items-center justify-center min-h-[400px] border border-border rounded-lg bg-card">
                <div className="text-center space-y-3 p-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary flex items-center justify-center mb-2">
                    <Cloud className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Ready to Assess Weather Risk</h3>
                  <p className="text-muted-foreground max-w-md">
                    Choose a location and date to get probability assessments for extreme weather conditions.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="border border-destructive rounded-lg bg-destructive p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-destructive-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive-foreground mb-1">Error</h3>
                    <p className="text-sm text-destructive-foreground">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-3 text-sm font-medium text-destructive-foreground hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-32 bg-card border border-border rounded-lg animate-pulse" />
                  ))}
                </div>
                <div className="h-80 bg-card border border-border rounded-lg animate-pulse" />
                <div className="h-64 bg-card border border-border rounded-lg animate-pulse" />
              </div>
            )}

            {results && !loading && (
              <>
                <RiskCards risks={results.risks} />
                <RiskChart risks={results.risks} />
                <div className="grid lg:grid-cols-2 gap-6">
                  <DriversTable drivers={results.drivers} />
                  <div className="space-y-6">
                    <MapPlaceholder
                      lat={results.meta.lat}
                      lon={results.meta.lon}
                      locationName={results.meta.locationName}
                    />
                    <Card className="bg-card border-border p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">NASA Satellite Snapshot</h3>
                      <NasaSnapshotMap
                        lat={results.meta.lat}
                        lon={results.meta.lon}
                        dateISO={results.meta.startDate}
                      />
                    </Card>
                  </div>
                </div>
                <TemperatureMap
                  drivers={results.drivers}
                  tempUnit={results.meta.units.temp}
                  lat={results.meta.lat}
                  lon={results.meta.lon}
                  locationName={results.meta.locationName}
                />
                <ExplanationPanel explanation={results.explanation} disclaimer={results.disclaimer} />
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
