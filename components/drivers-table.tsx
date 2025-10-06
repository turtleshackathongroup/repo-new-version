"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import type { Driver } from "@/types"

interface DriversTableProps {
  drivers: Driver[]
}

export function DriversTable({ drivers }: DriversTableProps) {
  const [sortBy, setSortBy] = useState<"name" | "value">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const sortedDrivers = [...drivers].sort((a, b) => {
    if (sortBy === "name") {
      return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    } else {
      return sortOrder === "asc" ? a.value - b.value : b.value - a.value
    }
  })

  const handleSort = (column: "name" | "value") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Weather Drivers</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th
                className="text-left py-3 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("name")}
              >
                Parameter {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="text-right py-3 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("value")}
              >
                Value {sortBy === "value" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">Unit</th>
            </tr>
          </thead>
          <tbody>
            {sortedDrivers.map((driver, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted">
                <td className="py-3 px-2 text-foreground">{driver.name}</td>
                <td className="py-3 px-2 text-right font-mono text-foreground">{driver.value}</td>
                <td className="py-3 px-2 text-right text-muted-foreground">{driver.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
