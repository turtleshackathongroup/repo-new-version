import type { NextRequest } from "next/server"

const NASA_BASE_REALTIME =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?service=WMTS&request=GetTile&version=1.0.0&layer=MODIS_Terra_Land_Surface_Temp_Day&style=default&tilematrixset=GoogleMapsCompatible_Level9&format=image%2Fpng"

const NASA_BASE_CLIMATOLOGY =
  "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MOD_LSTD_CLIM_M"

const NASA_TOKEN = process.env.NASA_GIBS_TOKEN

const appendToken = (url: string) => {
  if (!NASA_TOKEN) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}token=${encodeURIComponent(NASA_TOKEN)}`
}

export async function GET(_request: NextRequest, context: { params: { path?: string[] } }) {
  const segments = context.params.path ?? []

  if (segments.length !== 5) {
    return new Response("Invalid NASA tile path", { status: 400 })
  }

  const [variant, date, z, axisA, axisBWithExt] = segments

  if (!variant || !date || !z || !axisA || !axisBWithExt) {
    return new Response("Missing NASA tile parameters", { status: 400 })
  }

  const axisB = axisBWithExt.replace(/\.png$/i, "")

  if (!/^(realtime|climatology)$/.test(variant)) {
    return new Response("Unsupported NASA tile variant", { status: 400 })
  }

  const tileCol = variant === "realtime" ? axisA : axisB
  const tileRow = variant === "realtime" ? axisB : axisA

  let nasaUrl: string

  if (variant === "realtime") {
    nasaUrl = appendToken(
      `${NASA_BASE_REALTIME}&TileMatrix=${encodeURIComponent(z)}&TileCol=${encodeURIComponent(tileCol)}&TileRow=${encodeURIComponent(
        tileRow,
      )}&TIME=${encodeURIComponent(date)}`,
    )
  } else {
    nasaUrl = appendToken(
      `${NASA_BASE_CLIMATOLOGY}/default/${encodeURIComponent(date)}/EPSG4326_1km/${encodeURIComponent(z)}/${encodeURIComponent(
        tileRow,
      )}/${encodeURIComponent(tileCol)}.png`,
    )
  }

  try {
    const upstream = await fetch(nasaUrl)

    if (!upstream.ok || !upstream.body) {
      return new Response("Failed to fetch NASA imagery", { status: upstream.status || 502 })
    }

    const headers = new Headers()
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "image/png")
    headers.set("Cache-Control", variant === "realtime" ? "public, max-age=600" : "public, max-age=86400")

    return new Response(upstream.body, { status: 200, headers })
  } catch (error) {
    console.error("NASA tile proxy error", error)
    return new Response("NASA imagery proxy error", { status: 502 })
  }
}
