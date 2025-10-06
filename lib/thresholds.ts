export type TemperatureUnit = "F" | "C"
export type WindSpeedUnit = "MPH" | "MS"

export interface ThresholdConfig {
  hot: number
  cold: number
  windy: number
  wet: number
  uncomfortable: number
}

const round = (value: number, decimals = 1) => Number(value.toFixed(decimals))

const DEFAULT_TEMP_THRESHOLDS: Record<TemperatureUnit, Omit<ThresholdConfig, "windy">> = {
  F: {
    hot: 95,
    cold: 32,
    wet: 0.2,
    uncomfortable: 80,
  },
  C: {
    hot: 35,
    cold: 0,
    wet: round(0.2 * 25.4),
    uncomfortable: round((80 - 32) * (5 / 9)),
  },
}

const DEFAULT_WIND_THRESHOLDS: Record<WindSpeedUnit, number> = {
  MPH: 25,
  MS: round(25 * 0.44704),
}

export const getDefaultThresholds = (
  tempUnit: TemperatureUnit,
  windUnit: WindSpeedUnit,
): ThresholdConfig => ({
  ...DEFAULT_TEMP_THRESHOLDS[tempUnit],
  windy: DEFAULT_WIND_THRESHOLDS[windUnit],
})

export const convertTemperatureThreshold = (
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit,
): number => {
  if (!Number.isFinite(value) || from === to) {
    return value
  }

  if (from === "F" && to === "C") {
    return round((value - 32) * (5 / 9))
  }

  if (from === "C" && to === "F") {
    return round(value * (9 / 5) + 32)
  }

  return value
}

export const convertWindThreshold = (
  value: number,
  from: WindSpeedUnit,
  to: WindSpeedUnit,
): number => {
  if (!Number.isFinite(value) || from === to) {
    return value
  }

  if (from === "MPH" && to === "MS") {
    return round(value * 0.44704)
  }

  if (from === "MS" && to === "MPH") {
    return round(value / 0.44704)
  }

  return value
}

export const convertPrecipThreshold = (
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit,
): number => {
  if (!Number.isFinite(value) || from === to) {
    return value
  }

  if (from === "F" && to === "C") {
    return round(value * 25.4)
  }

  if (from === "C" && to === "F") {
    return round(value / 25.4, 2)
  }

  return value
}

export const normalizeThresholdInput = (value: string, fallback: number): number => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
