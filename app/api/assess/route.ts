import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { getDefaultThresholds } from "@/lib/thresholds"

interface OpenMeteoResponse {
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
    apparent_temperature?: number[]
    relative_humidity_2m?: number[]
    precipitation?: number[]
    wind_speed_10m?: number[]
    wind_gusts_10m?: number[]
  }
}

const CELSIUS_TO_FAHRENHEIT = (value: number) => (value * 9) / 5 + 32
const FAHRENHEIT_TO_CELSIUS = (value: number) => ((value - 32) * 5) / 9
const MS_TO_MPH = (value: number) => value * 2.236936
const MM_TO_IN = (value: number) => value / 25.4
const roundTo = (value: number, decimals = 1) => Number(value.toFixed(decimals))

const parseThresholdParam = (params: URLSearchParams, key: string, fallback: number) => {
  const value = params.get(key)

  if (value === null) {
    return fallback
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

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
  const defaultThresholds = getDefaultThresholds(unitsTemp, unitsWind)
  const thresholds = {
    hot: parseThresholdParam(searchParams, "thresholdHot", defaultThresholds.hot),
    cold: parseThresholdParam(searchParams, "thresholdCold", defaultThresholds.cold),
    windy: parseThresholdParam(searchParams, "thresholdWindy", defaultThresholds.windy),
    wet: parseThresholdParam(searchParams, "thresholdWet", defaultThresholds.wet),
    uncomfortable: parseThresholdParam(
      searchParams,
      "thresholdUncomfortable",
      defaultThresholds.uncomfortable,
    ),
  }

  try {
    const hourlyParameters = [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "wind_speed_10m",
      "wind_gusts_10m",
    ]

    const baseSearchParams = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      start_date: startDate,
      end_date: endDate,
      hourly: hourlyParameters.join(","),
      timezone: "UTC",
    })

    const fetchWeatherData = async (baseUrl: string) => {
      const url = new URL(baseUrl)
      url.search = baseSearchParams.toString()

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 60 * 60 },
      })

      if (!response.ok) {
        throw new Error(`Open-Meteo API returned ${response.status}`)
      }

      const json = (await response.json()) as OpenMeteoResponse

      if (!json.hourly || !Array.isArray(json.hourly.time) || json.hourly.time.length === 0) {
        throw new Error("Open-Meteo API response did not include hourly data")
      }

      return json
    }

    let weatherData: OpenMeteoResponse

    try {
      weatherData = await fetchWeatherData("https://api.open-meteo.com/v1/forecast")
    } catch (forecastError) {
      console.warn("Open-Meteo forecast API failed, trying archive", forecastError)
      weatherData = await fetchWeatherData("https://archive-api.open-meteo.com/v1/archive")
    }

    const hourly = weatherData.hourly
    const times = hourly?.time ?? []

    const normalizeTimeString = (value: string) => {
      if (!value) return value
      return value.includes("Z") ? value : `${value}Z`
    }

    const parseTimestamp = (value: string) => Date.parse(normalizeTimeString(value))

    const targetTimePart = time.includes(":") ? time : `${time}:00`
    const targetTimestamp = `${startDate}T${targetTimePart}`
    const targetMs = parseTimestamp(targetTimestamp)

    const targetIndex = times.reduce((bestIndex, current, index) => {
      if (!current) {
        return bestIndex
      }

      const currentMs = parseTimestamp(current)

      if (!Number.isFinite(currentMs)) {
        return bestIndex
      }

      if (!Number.isFinite(targetMs)) {
        return bestIndex >= 0 ? bestIndex : index
      }

      if (bestIndex === -1) {
        return index
      }

      const bestMs = parseTimestamp(times[bestIndex] ?? "")
      const bestDiff = Math.abs(bestMs - targetMs)
      const currentDiff = Math.abs(currentMs - targetMs)

      if (currentDiff < bestDiff) {
        return index
      }

      if (currentDiff === bestDiff && currentMs > bestMs) {
        return index
      }

      return bestIndex
    }, -1)

    const resolvedTargetIndex = targetIndex >= 0 ? targetIndex : 0

    const dayIndices = times.reduce<number[]>((acc, timestamp, index) => {
      if (typeof timestamp === "string" && timestamp.startsWith(startDate)) {
        acc.push(index)
      }
      return acc
    }, [])

    const getSeriesValue = (series: number[] | undefined, index: number) => {
      if (!series || index < 0 || index >= series.length) {
        return undefined
      }

      const value = series[index]
      return Number.isFinite(value) ? value : undefined
    }

    const gatherSeriesValues = (series: number[] | undefined) => {
      if (!series) {
        return []
      }

      return dayIndices
        .map((index) => getSeriesValue(series, index))
        .filter((value): value is number => value !== undefined)
    }

    const temperatureSeries = hourly?.temperature_2m
    const apparentSeries = hourly?.apparent_temperature
    const humiditySeries = hourly?.relative_humidity_2m
    const precipSeries = hourly?.precipitation
    const windSeries = hourly?.wind_speed_10m
    const gustSeries = hourly?.wind_gusts_10m

    const selectedTemperatureC = getSeriesValue(temperatureSeries, resolvedTargetIndex)
    const selectedApparentC = getSeriesValue(apparentSeries, resolvedTargetIndex)
    const selectedHumidity = getSeriesValue(humiditySeries, resolvedTargetIndex)
    const selectedPrecipMm = getSeriesValue(precipSeries, resolvedTargetIndex)
    const selectedWindMs = getSeriesValue(windSeries, resolvedTargetIndex)

    const dayTemperaturesC = gatherSeriesValues(temperatureSeries)
    const dayHumidity = gatherSeriesValues(humiditySeries)
    const dayPrecipMm = gatherSeriesValues(precipSeries).map((value) => (value >= 0 ? value : 0))
    const dayWindsMs = gatherSeriesValues(windSeries)
    const dayGustsMs = gatherSeriesValues(gustSeries)

    const temperatureC = selectedTemperatureC ?? dayTemperaturesC[0] ?? 0
    const windSpeedMs = selectedWindMs ?? dayWindsMs[0] ?? 0
    const humidityRaw =
      selectedHumidity ??
      (dayHumidity.length > 0
        ? dayHumidity.reduce((acc, value) => acc + value, 0) / dayHumidity.length
        : 0)
    const humidity = Math.min(Math.max(humidityRaw, 0), 100)
    const precipMm =
      selectedPrecipMm !== undefined && selectedPrecipMm >= 0
        ? selectedPrecipMm
        : dayPrecipMm[0] ?? 0

    const maxTempC = dayTemperaturesC.length > 0 ? Math.max(...dayTemperaturesC) : temperatureC
    const minTempC = dayTemperaturesC.length > 0 ? Math.min(...dayTemperaturesC) : temperatureC
    const gustMs = dayGustsMs.length > 0 ? Math.max(...dayGustsMs) : windSpeedMs
    const totalPrecipMm = dayPrecipMm.reduce((acc, value) => acc + value, 0)

    const temperature = unitsTemp === "F" ? CELSIUS_TO_FAHRENHEIT(temperatureC) : temperatureC
    const maxTemp = unitsTemp === "F" ? CELSIUS_TO_FAHRENHEIT(maxTempC) : maxTempC
    const minTemp = unitsTemp === "F" ? CELSIUS_TO_FAHRENHEIT(minTempC) : minTempC
    const windSpeed = unitsWind === "MPH" ? MS_TO_MPH(windSpeedMs) : windSpeedMs
    const gusts = unitsWind === "MPH" ? MS_TO_MPH(gustMs) : gustMs
    const precip = unitsTemp === "F" ? MM_TO_IN(precipMm) : precipMm
    const dailyPrecip = unitsTemp === "F" ? MM_TO_IN(totalPrecipMm) : totalPrecipMm

    const heatIndexSourceC =
      selectedApparentC ?? FAHRENHEIT_TO_CELSIUS(computeHeatIndex(CELSIUS_TO_FAHRENHEIT(temperatureC), humidity))
    const heatIndex =
      unitsTemp === "F" ? CELSIUS_TO_FAHRENHEIT(heatIndexSourceC) : heatIndexSourceC

    const selectedTimestamp = times[resolvedTargetIndex] ?? targetTimestamp
    const observationIso = (() => {
      if (!selectedTimestamp) return undefined
      const normalized = normalizeTimeString(selectedTimestamp)
      const parsed = Number.isFinite(Date.parse(normalized)) ? new Date(normalized).toISOString() : undefined
      return parsed
    })()

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
        observationTime: observationIso,
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
        "Observations are sourced from the Open-Meteo API using the selected date, time, and coordinates. Probabilities reflect how the observed conditions relate to your configured thresholds.",
      disclaimer: "Prototype for Space Apps; not for operational forecasting.",
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error("Failed to fetch weather data", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch weather data" },
      { status: 502 },
    )
  }
}
