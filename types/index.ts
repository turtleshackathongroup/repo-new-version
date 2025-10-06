export interface QueryParams {
  locationName?: string
  lat: number
  lon: number
  startDate: string
  endDate?: string
  time: string
  unitsTemp: "C" | "F"
  unitsWind: "MS" | "MPH"
  thresholds: {
    hot: number
    cold: number
    windy: number
    wet: number
    uncomfortable: number
  }
}

export interface RiskItem {
  type: string
  label: string
  probability: number
  confidence: "low" | "medium" | "high"
}

export interface Driver {
  name: string
  value: number
  unit: string
}

export interface ApiResponse {
  meta: {
    locationName: string
    lat: number
    lon: number
    startDate: string
    endDate: string
    observationTime?: string
    units: {
      temp: "C" | "F"
      wind: "MS" | "MPH"
    }
  }
  risks: RiskItem[]
  drivers: Driver[]
  explanation: string
  disclaimer: string
}
