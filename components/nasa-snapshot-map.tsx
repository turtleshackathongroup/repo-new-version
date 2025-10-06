"use client"

import * as React from "react"

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function NasaSnapshotMap({
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
  const dateStr = dateISO?.slice(0, 10) ?? ""

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !dateStr) {
    return null
  }

  const dLat = kmHalfSize / 111
  const cosine = Math.cos((lat * Math.PI) / 180)
  const dLon = kmHalfSize / (111 * (cosine || 1e-6))

  const south = clamp(lat - dLat, -90, 90)
  const north = clamp(lat + dLat, -90, 90)
  const west = clamp(lon - dLon, -180, 180)
  const east = clamp(lon + dLon, -180, 180)

  const src = [
    "https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot",
    "LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor,Reference_Features,Reference_Labels",
    "CRS=EPSG:4326",
    `BBOX=${west},${south},${east},${north}`,
    `TIME=${dateStr}`,
    "FORMAT=image/png",
    `WIDTH=${width}`,
    `HEIGHT=${height}`,
  ].join("&")

  const [loaded, setLoaded] = React.useState(false)
  const [errored, setErrored] = React.useState(false)

  React.useEffect(() => {
    setLoaded(false)
    setErrored(false)
  }, [src])

  return (
    <div className="w-full">
      {!loaded && !errored && (
        <div className="w-full h-64 animate-pulse rounded-xl bg-muted" aria-hidden />
      )}
      {!errored && (
        <a href={src} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={src}
            alt={`Satellite snapshot (True Color) for ${dateStr} around ${lat.toFixed(3)},${lon.toFixed(3)}`}
            className={`w-full rounded-xl shadow ${loaded ? "" : "hidden"}`}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        </a>
      )}
      {errored && (
        <p className="text-sm text-muted-foreground">
          NASA snapshot unavailable right now. Try another date or zoom level.
        </p>
      )}
    </div>
  )
}

export default NasaSnapshotMap
