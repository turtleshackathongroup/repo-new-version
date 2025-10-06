import { Card } from "@/components/ui/card"

interface MapPlaceholderProps {
  lat: number
  lon: number
  locationName: string
}

export function MapPlaceholder({ lat, lon, locationName }: MapPlaceholderProps) {
  const mapQuery = encodeURIComponent(`${lat},${lon}`)
  const mapTitle = locationName ? `Map showing ${locationName}` : "Location map"
  return (
    <Card className="h-full bg-card border-border p-6 flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-foreground">Location Map</h3>
      <div className="relative flex-1 min-h-[320px] rounded-lg bg-card overflow-hidden">
        <iframe
          className="absolute inset-0 h-full w-full border-0"
          src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=11&ie=UTF8&iwloc=&output=embed`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title={mapTitle}
        />
        <div className="absolute bottom-4 left-4 bg-card rounded-md px-3 py-2 shadow-sm border border-border text-sm text-foreground">
          <p className="font-medium">{locationName}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {lat.toFixed(4)}°, {lon.toFixed(4)}°
          </p>
        </div>
      </div>
    </Card>
  )
}
