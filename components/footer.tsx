export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-12">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            <p>Data source: NASA POWER (Prediction Of Worldwide Energy Resources) hourly point API</p>
          </div>
          <div className="text-center md:text-right">
            <p className="font-medium">NASA International Space Apps Challenge 2025</p>
            <p className="text-xs mt-1">Prototype for educational purposes • Not for operational forecasting</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
