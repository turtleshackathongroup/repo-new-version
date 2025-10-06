"use client"

import * as React from "react"

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function NasaSnapshotMap({
  lat,
  lon,
  dateISO,
  width = 1280,
  height = 720,
  kmHalfSize = 150,
}: {
  lat: number
  lon: number
  dateISO: string
  width?: number
  height?: number
  kmHalfSize?: number
}) {
  let dateStr = dateISO.slice(0, 10)

  // Check if the date is in the future or too recent (MODIS has 1-2 day delay)
  const requestedDate = new Date(dateStr)
  const today = new Date()
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(today.getDate() - 2)

  // If date is in the future or within last 2 days, use a safe fallback date
  if (requestedDate > twoDaysAgo) {
    dateStr = twoDaysAgo.toISOString().slice(0, 10)
    console.log("[v0] NASA Snapshot: Requested date too recent, using fallback:", dateStr)
  }

  const dLat = kmHalfSize / 111
  const dLon = kmHalfSize / (111 * Math.cos((lat * Math.PI) / 180) || 1e-6)

  const south = clamp(lat - dLat, -90, 90)
  const north = clamp(lat + dLat, -90, 90)
  const west = clamp(lon - dLon, -180, 180)
  const east = clamp(lon + dLon, -180, 180)

  const src = [
    "https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot",
    "LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor,Reference_Features_15m,Coastlines_15m",
    "CRS=EPSG:4326",
    `BBOX=${west},${south},${east},${north}`,
    `TIME=${dateStr}`,
    "FORMAT=image/jpeg",
    `WIDTH=${width}`,
    `HEIGHT=${height}`,
    "AUTOSCALE=TRUE",
  ].join("&")

  const [loaded, setLoaded] = React.useState(false)
  const [errored, setErrored] = React.useState(false)

  React.useEffect(() => {
    console.log("[v0] NASA Snapshot URL:", src)
    console.log("[v0] NASA Snapshot params:", { lat, lon, dateStr, bbox: `${west},${south},${east},${north}` })
  }, [src, lat, lon, dateStr, west, south, east, north])

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !dateStr) {
    return null
  }

  return (
    <div className="w-full space-y-3">
      {!loaded && !errored && <div className="w-full h-64 animate-pulse rounded-xl bg-muted" aria-hidden />}
      {!errored && (
        <div>
          <a href={src} target="_blank" rel="noopener noreferrer">
            <img
              src={src || "/placeholder.svg"}
              alt={`Satellite snapshot (True Color) for ${dateStr} around ${lat.toFixed(3)},${lon.toFixed(3)}`}
              className={`w-full rounded-xl border border-border ${loaded ? "" : "hidden"}`}
              onLoad={() => {
                console.log("[v0] NASA Snapshot: Image loaded successfully")
                setLoaded(true)
              }}
              onError={(e) => {
                console.error("[v0] NASA Snapshot: Image failed to load", e)
                setErrored(true)
              }}
            />
          </a>
          {loaded && (
            <p className="text-xs text-muted-foreground mt-2">
              MODIS Terra True Color imagery from {dateStr}. Click image to open in new tab.
            </p>
          )}
        </div>
      )}
      {errored && (
        <div className="p-4 border border-border rounded-xl bg-muted">
          <p className="text-sm text-muted-foreground mb-2">
            NASA satellite snapshot unavailable for this date and location.
          </p>
          <p className="text-xs text-muted-foreground">
            This may be due to cloud cover, data availability, or the date being too recent. MODIS data typically has a
            1-2 day delay.
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-2 inline-block"
          >
            Try opening the image directly
          </a>
        </div>
      )}
    </div>
  )
}
