"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import type { Driver } from "@/types"

interface TemperatureMapProps {
  drivers: Driver[]
  tempUnit: "C" | "F"
  lat: number
  lon: number
  locationName: string
}

export function TemperatureMap({ drivers, tempUnit, lat, lon, locationName }: TemperatureMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [mapInstance, setMapInstance] = useState<any>(null)

  // Extract temperature data
  const temp = drivers.find((d) => d.name === "Temperature")?.value || 0
  const maxTemp = drivers.find((d) => d.name === "Max Temp")?.value || 0
  const minTemp = drivers.find((d) => d.name === "Min Temp")?.value || 0
  const feelsLike = drivers.find((d) => d.name === "Feels Like")?.value || 0

  // Calculate temperature intensity (0-1) for color mapping
  const tempRange = tempUnit === "C" ? { min: -20, max: 45 } : { min: -4, max: 113 }
  const intensity = Math.max(0, Math.min(1, (temp - tempRange.min) / (tempRange.max - tempRange.min)))

  // Get color based on temperature intensity
  const getTemperatureColor = (intensity: number) => {
    if (intensity < 0.2) return "#3b82f6" // blue - cold
    if (intensity < 0.4) return "#22c55e" // green - cool
    if (intensity < 0.6) return "#eab308" // yellow - mild
    if (intensity < 0.8) return "#f97316" // orange - warm
    return "#ef4444" // red - hot
  }

  const markerColor = getTemperatureColor(intensity)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    let map: any
    let circles: any[] = []

    const initMap = async () => {
      const L = (await import("leaflet")).default

      // Fix for default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const mapElement = document.getElementById("temperature-map")
      if (!mapElement) return

      map = L.map(mapElement).setView([lat, lon], 10)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      // Add temperature circles
      const circle1 = L.circle([lat, lon], {
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.2,
        radius: 3000,
        weight: 2,
        opacity: 0.4,
      }).addTo(map)

      const circle2 = L.circle([lat, lon], {
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.4,
        radius: 1500,
        weight: 2,
        opacity: 0.6,
      }).addTo(map)

      const circle3 = L.circle([lat, lon], {
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.8,
        radius: 800,
        weight: 2,
        opacity: 1,
      }).addTo(map)

      circle3.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <p style="font-weight: 600; margin: 0 0 4px 0;">${locationName}</p>
          <p style="font-size: 12px; margin: 2px 0; color: #666;">Temperature: ${temp}°${tempUnit}</p>
          <p style="font-size: 12px; margin: 2px 0; color: #666;">Feels Like: ${feelsLike}°${tempUnit}</p>
        </div>
      `)

      circles = [circle1, circle2, circle3]
      setMapInstance(map)
    }

    initMap()

    return () => {
      if (map) {
        map.remove()
      }
    }
  }, [isMounted, lat, lon, markerColor, locationName, temp, tempUnit, feelsLike])

  if (!isMounted) {
    return (
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Temperature Map</h3>
        <div className="h-[400px] rounded-lg bg-muted animate-pulse" />
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Temperature Map</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current:</span>
          <span className="font-bold text-foreground font-mono">
            {temp}°{tempUnit}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Leaflet Map */}
        <div className="relative h-[400px] rounded-lg overflow-hidden border border-border">
          <div id="temperature-map" className="h-full w-full" />

          {/* Legend overlay */}
          <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border z-[1000]">
            <p className="text-xs font-semibold mb-2 text-foreground">Temperature Scale</p>
            <div className="flex gap-1">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded bg-blue-500" />
                <span className="text-[10px] text-muted-foreground mt-1">Cold</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded bg-green-500" />
                <span className="text-[10px] text-muted-foreground mt-1">Cool</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded bg-yellow-500" />
                <span className="text-[10px] text-muted-foreground mt-1">Mild</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded bg-orange-500" />
                <span className="text-[10px] text-muted-foreground mt-1">Warm</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded bg-red-500" />
                <span className="text-[10px] text-muted-foreground mt-1">Hot</span>
              </div>
            </div>
          </div>
        </div>

        {/* Temperature stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Min</p>
            <p className="text-lg font-bold text-foreground font-mono">
              {minTemp}°{tempUnit}
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className="text-lg font-bold text-foreground font-mono">
              {temp}°{tempUnit}
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Max</p>
            <p className="text-lg font-bold text-foreground font-mono">
              {maxTemp}°{tempUnit}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
