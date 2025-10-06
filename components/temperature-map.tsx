import { Card } from "@/components/ui/card"

interface TemperatureMapProps {
  lat: number
  lon: number
  locationName: string
  date?: string
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function TemperatureMap({ lat, lon, locationName, date }: TemperatureMapProps) {
  const regionPadding = 5
  const minLat = clamp(lat - regionPadding, -90, 90)
  const maxLat = clamp(lat + regionPadding, -90, 90)
  const minLon = clamp(lon - regionPadding, -180, 180)
  const maxLon = clamp(lon + regionPadding, -180, 180)

  const targetDate = date || new Date().toISOString().split("T")[0]

  const params = new URLSearchParams({
    service: "WMS",
    request: "GetMap",
    version: "1.3.0",
    layers: "MODIS_Terra_Land_Surface_Temp_Day",
    styles: "",
    format: "image/png",
    width: "512",
    height: "512",
    crs: "EPSG:4326",
    bbox: `${minLat},${minLon},${maxLat},${maxLon}`,
    time: targetDate,
  })

  const mapUrl = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${params.toString()}`

  const title = locationName
    ? `NASA surface temperature map for ${locationName}`
    : "NASA surface temperature map"

  return (
    <Card className="h-full bg-card border-border p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Surface Temperature Map</h3>
        <p className="text-sm text-muted-foreground">
          Daily land surface temperature from NASA MODIS (Terra) within ~
          <span className="font-mono">{regionPadding}°</span> of the selected location.
        </p>
      </div>
      <div className="relative flex-1 min-h-[320px] rounded-lg bg-card overflow-hidden border border-border">
        <img src={mapUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur rounded-md px-3 py-2 shadow-sm border border-border text-sm text-foreground">
          <p className="font-medium">{locationName}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {lat.toFixed(4)}°, {lon.toFixed(4)}°
          </p>
          <p className="text-xs text-muted-foreground">{targetDate}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Source: <a href="https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs" target="_blank" rel="noreferrer" className="underline hover:text-foreground">NASA Global Imagery Browse Services (GIBS)</a>
      </p>
    </Card>
  )
}
