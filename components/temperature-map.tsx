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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    let map: any
    let marker: any

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

      map = L.map(mapElement, {
        maxZoom: 8,
        minZoom: 1,
      }).setView([lat, lon], 6)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        opacity: 0.7,
      }).addTo(map)

      // NASA GIBS land surface temperature layer (Celsius)
      L.tileLayer(
        "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day_C/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png",
        {
          attribution:
            'Temperature imagery courtesy of NASA EOSDIS LANCE and GIBS/Worldview',
          opacity: 0.6,
          tileSize: 256,
          maxZoom: 8,
          minZoom: 1,
        },
      ).addTo(map)

      marker = L.marker([lat, lon]).addTo(map)
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 8px; min-width: 180px;">
          <p style="font-weight: 600; margin: 0 0 8px 0; font-size: 14px;">${locationName}</p>
          <div style="display: grid; gap: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #666;">Temperature:</span>
              <span style="font-weight: 600;">${temp}°${tempUnit}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #666;">Feels Like:</span>
              <span style="font-weight: 600;">${feelsLike}°${tempUnit}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #666;">Min / Max:</span>
              <span style="font-weight: 600;">${minTemp}° / ${maxTemp}°${tempUnit}</span>
            </div>
          </div>
        </div>
      `)

      setMapInstance(map)
    }

    initMap()

    return () => {
      if (map) {
        map.remove()
      }
    }
  }, [isMounted, lat, lon, locationName, temp, tempUnit, feelsLike, minTemp, maxTemp])

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
        {/* Leaflet Map with Temperature Overlay */}
        <div className="relative h-[500px] rounded-lg overflow-hidden border border-border">
          <div id="temperature-map" className="h-full w-full" />

          {/* Legend overlay */}
          <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-border z-[1000]">
            <p className="text-xs font-semibold mb-2 text-foreground">Temperature Overlay</p>
            <p className="text-[10px] text-muted-foreground mb-2">NASA GIBS Land Surface Temperature (°C)</p>
            <div className="flex gap-1">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded" style={{ background: "#9d5cff" }} />
                <span className="text-[10px] text-muted-foreground mt-1">-40°</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded" style={{ background: "#5c8aff" }} />
                <span className="text-[10px] text-muted-foreground mt-1">-20°</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded" style={{ background: "#5cffff" }} />
                <span className="text-[10px] text-muted-foreground mt-1">0°</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded" style={{ background: "#5cff5c" }} />
                <span className="text-[10px] text-muted-foreground mt-1">20°</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded" style={{ background: "#ffff5c" }} />
                <span className="text-[10px] text-muted-foreground mt-1">30°</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded" style={{ background: "#ff5c5c" }} />
                <span className="text-[10px] text-muted-foreground mt-1">40°</span>
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
