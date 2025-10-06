import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"

interface PowerApiResponse {
  properties?: {
    parameter?: Record<string, Record<string, number | string>>
  }
}

const CELSIUS_TO_FAHRENHEIT = (value: number) => (value * 9) / 5 + 32
const FAHRENHEIT_TO_CELSIUS = (value: number) => ((value - 32) * 5) / 9
const MS_TO_MPH = (value: number) => value * 2.236936
const MM_TO_IN = (value: number) => value / 25.4
const roundTo = (value: number, decimals = 1) => Number(value.toFixed(decimals))

const computeHeatIndex = (tempF: number, humidity: number) => {
  if (tempF < 80) {
    return tempF
  }

  const hi =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humidity -
    0.22475541 * tempF * humidity -
    0.00683783 * tempF * tempF -
    0.05481717 * humidity * humidity +
    0.00122874 * tempF * tempF * humidity +
    0.00085282 * tempF * humidity * humidity -
    0.00000199 * tempF * tempF * humidity * humidity

  return hi
}

const computeProbability = (value: number, threshold: number, direction: "above" | "below") => {
  if (!Number.isFinite(value) || !Number.isFinite(threshold)) {
    return 0.2
  }

  const diff = direction === "above" ? value - threshold : threshold - value
  const scale = Math.max(Math.abs(threshold), 1)
  const normalized = diff / (scale * 0.35)
  const probability = 1 / (1 + Math.exp(-normalized))
  return Number(probability.toFixed(2))
}

const extractHourFromKey = (key: string) => {
  const digits = key.replace(/\D/g, "")
  const hourString = digits.slice(-2)
  const hour = Number.parseInt(hourString, 10)
  return Number.isFinite(hour) ? hour : 0
}

const selectKeyForSeries = (series: Record<string, number | string>, dateKey: string, targetHour: number) => {
  const keys = Object.keys(series)
  const candidateKeys = keys.filter((key) => key.includes(dateKey))
  const pool = candidateKeys.length > 0 ? candidateKeys : keys

  if (pool.length === 0) {
    return { key: "", hour: targetHour }
  }

  const selectedKey = pool.reduce((bestKey, currentKey) => {
    if (!bestKey) return currentKey
    const bestHour = extractHourFromKey(bestKey)
    const currentHour = extractHourFromKey(currentKey)
    const bestDiff = Math.abs(bestHour - targetHour)
    const currentDiff = Math.abs(currentHour - targetHour)

    if (currentDiff < bestDiff) {
      return currentKey
    }

    if (currentDiff === bestDiff && currentHour > bestHour) {
      return currentKey
    }

    return bestKey
  }, pool[0])

  return { key: selectedKey, hour: extractHourFromKey(selectedKey) }
}

const INVALID_POWER_VALUES = new Set([-999, -888, -777, -699, -666, -9999, 9999])

const isValidPowerValue = (value: number) => {
  if (!Number.isFinite(value)) {
    return false
  }

  if (INVALID_POWER_VALUES.has(value)) {
    return false
  }

  if (Math.abs(value) >= 900 || value <= -900) {
    return false
  }

  return true
}

const parseSeriesValue = (series: Record<string, number | string> | undefined, key: string) => {
  if (!series || !key || !(key in series)) {
    return undefined
  }

  const rawValue = series[key]
  const parsed = typeof rawValue === "number" ? rawValue : Number.parseFloat(rawValue)

  if (!Number.isFinite(parsed)) {
    return undefined
  }

  if (!isValidPowerValue(parsed)) {
    return undefined
  }

  return parsed
}

const gatherDayValues = (series: Record<string, number | string> | undefined, dateKey: string) => {
  if (!series) {
    return []
  }

  return Object.entries(series)
    .filter(([key]) => key.includes(dateKey))
    .map(([key]) => parseSeriesValue(series, key))
    .filter((value): value is number => value !== undefined)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const lat = Number.parseFloat(searchParams.get("lat") || "0")
  const lon = Number.parseFloat(searchParams.get("lon") || "0")
  const startDate = searchParams.get("startDate") || new Date().toISOString().split("T")[0]
  const endDate = searchParams.get("endDate") || startDate
  const time = searchParams.get("time") || "12:00"
  const locationName = searchParams.get("locationName")
  const unitsTemp = (searchParams.get("unitsTemp") || "F") as "C" | "F"
  const unitsWind = (searchParams.get("unitsWind") || "MPH") as "MS" | "MPH"
  const thresholds = {
    hot: Number.parseFloat(searchParams.get("thresholdHot") || "35"),
    cold: Number.parseFloat(searchParams.get("thresholdCold") || "0"),
    windy: Number.parseFloat(searchParams.get("thresholdWindy") || "10"),
    wet: Number.parseFloat(searchParams.get("thresholdWet") || "10"),
    uncomfortable: Number.parseFloat(searchParams.get("thresholdUncomfortable") || "32"),
  }

  const dateKeyStart = startDate.replace(/-/g, "")
  const dateKeyEnd = endDate.replace(/-/g, "")
  const targetHour = Number.parseInt(time.split(":")[0] || "12", 10)

  try {
    const nasaUrl = new URL("https://power.larc.nasa.gov/api/temporal/hourly/point")
    nasaUrl.search = new URLSearchParams({
      parameters: "T2M,WS2M,RH2M,PRECTOTCORR",
      community: "AG",
      longitude: lon.toString(),
      latitude: lat.toString(),
      start: dateKeyStart,
      end: dateKeyEnd,
      format: "JSON",
    }).toString()

    const response = await fetch(nasaUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 * 60 },
    })

    if (!response.ok) {
      throw new Error(`NASA POWER API returned ${response.status}`)
    }

    const powerData = (await response.json()) as PowerApiResponse
    const parameters = powerData.properties?.parameter

    if (!parameters || !parameters.T2M) {
      throw new Error("NASA POWER API response did not include temperature data")
    }

    const { key: selectedKey, hour: selectedHour } = selectKeyForSeries(parameters.T2M, dateKeyStart, targetHour)

    const dayTemperaturesC = gatherDayValues(parameters.T2M, dateKeyStart)
    const dayWindsMs = gatherDayValues(parameters.WS2M, dateKeyStart)
    const dayHumidity = gatherDayValues(parameters.RH2M, dateKeyStart)
    const dayPrecipMmRaw = gatherDayValues(parameters.PRECTOTCORR, dateKeyStart)
    const dayPrecipMm = dayPrecipMmRaw.map((value) => (value >= 0 ? value : 0))

    const temperatureC =
      parseSeriesValue(parameters.T2M, selectedKey) ?? dayTemperaturesC[0] ?? 0
    const windSpeedMs =
      parseSeriesValue(parameters.WS2M, selectedKey) ?? dayWindsMs[0] ?? 0
    const humidityRaw =
      parseSeriesValue(parameters.RH2M, selectedKey) ??
      (dayHumidity.length > 0
        ? dayHumidity.reduce((acc, value) => acc + value, 0) / dayHumidity.length
        : 0)
    const humidity = Math.min(Math.max(humidityRaw, 0), 100)
    const precipMmRaw = parseSeriesValue(parameters.PRECTOTCORR, selectedKey)
    const precipMm =
      precipMmRaw !== undefined && precipMmRaw >= 0
        ? precipMmRaw
        : (dayPrecipMm[0] ?? 0)

    const maxTempC = dayTemperaturesC.length > 0 ? Math.max(...dayTemperaturesC) : temperatureC
    const minTempC = dayTemperaturesC.length > 0 ? Math.min(...dayTemperaturesC) : temperatureC
    const gustMs = dayWindsMs.length > 0 ? Math.max(...dayWindsMs) : windSpeedMs
    const totalPrecipMm = dayPrecipMm.reduce((acc, value) => acc + value, 0)

    const temperature = unitsTemp === "F" ? CELSIUS_TO_FAHRENHEIT(temperatureC) : temperatureC
    const maxTemp = unitsTemp === "F" ? CELSIUS_TO_FAHRENHEIT(maxTempC) : maxTempC
    const minTemp = unitsTemp === "F" ? CELSIUS_TO_FAHRENHEIT(minTempC) : minTempC
    const windSpeed = unitsWind === "MPH" ? MS_TO_MPH(windSpeedMs) : windSpeedMs
    const gusts = unitsWind === "MPH" ? MS_TO_MPH(gustMs) : gustMs
    const precip = unitsTemp === "F" ? MM_TO_IN(precipMm) : precipMm
    const dailyPrecip = unitsTemp === "F" ? MM_TO_IN(totalPrecipMm) : totalPrecipMm

    const heatIndexF = computeHeatIndex(CELSIUS_TO_FAHRENHEIT(temperatureC), humidity)
    const heatIndex = unitsTemp === "F" ? heatIndexF : FAHRENHEIT_TO_CELSIUS(heatIndexF)

    const hotProbability = computeProbability(temperature, thresholds.hot, "above")
    const coldProbability = computeProbability(temperature, thresholds.cold, "below")
    const windyProbability = computeProbability(windSpeed, thresholds.windy, "above")
    const wetProbability = computeProbability(precip, thresholds.wet, "above")
    const discomfortDriver = (heatIndex + humidity / 5) / 2
    const uncomfortableProbability = computeProbability(discomfortDriver, thresholds.uncomfortable, "above")

    const responsePayload: ApiResponse = {
      meta: {
        locationName: locationName || `Location at ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        lat,
        lon,
        startDate,
        endDate,
        observationTime: `${startDate}T${selectedHour.toString().padStart(2, "0")}:00Z`,
        units: {
          temp: unitsTemp,
          wind: unitsWind,
        },
      },
      risks: [
        { type: "very_hot", label: "Very Hot", probability: hotProbability, confidence: "high" },
        { type: "very_cold", label: "Very Cold", probability: coldProbability, confidence: "medium" },
        { type: "very_windy", label: "Very Windy", probability: windyProbability, confidence: "medium" },
        { type: "very_wet", label: "Very Wet", probability: wetProbability, confidence: "medium" },
        {
          type: "very_uncomfortable",
          label: "Very Uncomfortable",
          probability: uncomfortableProbability,
          confidence: "medium",
        },
      ],
      drivers: [
        { name: "Temperature", value: roundTo(temperature), unit: `°${unitsTemp}` },
        { name: "Max Temp", value: roundTo(maxTemp), unit: `°${unitsTemp}` },
        { name: "Min Temp", value: roundTo(minTemp), unit: `°${unitsTemp}` },
        { name: "Feels Like", value: roundTo(heatIndex), unit: `°${unitsTemp}` },
        { name: "Wind Speed", value: roundTo(windSpeed), unit: unitsWind === "MPH" ? "MPH" : "m/s" },
        { name: "Gusts", value: roundTo(gusts), unit: unitsWind === "MPH" ? "MPH" : "m/s" },
        { name: "Humidity", value: roundTo(humidity), unit: "%" },
        {
          name: "Hourly Precip",
          value: roundTo(precip, unitsTemp === "F" ? 2 : 1),
          unit: unitsTemp === "F" ? "in" : "mm",
        },
        {
          name: "Daily Precip",
          value: roundTo(dailyPrecip, unitsTemp === "F" ? 2 : 1),
          unit: unitsTemp === "F" ? "in" : "mm",
        },
      ],
      explanation:
        "Observations are sourced from the NASA POWER API using the selected date, time, and coordinates. Probabilities reflect how the observed conditions relate to your configured thresholds.",
      disclaimer: "Prototype for Space Apps; not for operational forecasting.",
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error("Failed to fetch NASA POWER data", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch NASA POWER data" },
      { status: 502 },
    )
  }
}
