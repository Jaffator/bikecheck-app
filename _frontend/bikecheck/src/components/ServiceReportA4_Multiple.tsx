import logoDark from "../assets/icons/bikecheck/Logo_dark.svg";

function ServiceReportA4() {
  return (
    <div className="antialiased min-h-screen py-4 px-2 sm:py-8 sm:px-4 flex justify-center">
      <main
        className="w-full max-w-[710px] text-left bg-surface-paper shadow-lg rounded-sm report-container overflow-hidden"
        data-purpose="document-preview"
      >
        <div className="p-6 sm:p-10 flex flex-col gap-8">
          <header className="flex flex-col items-center gap-6" data-purpose="report-header">
            <img src={logoDark} alt="BikeCheck" className="h-10 w-auto" />
            <h2 className="font-display font-medium text-xl sm:text-3xl text-center tracking-tight text-text-muted uppercase">
              Service Report
            </h2>
          </header>
          <section className=" py-4 flex justify-between gap-4 overflow-x-auto whitespace-nowrap" data-purpose="meta-info">
            <div className="flex flex-col pr-4">
              <span className="font-display font-bold text-xs uppercase text-text-main">Customer Bike</span>
              <span className="font-sans text-sm mt-1">Crux Gravel</span>
            </div>
            <div className="flex flex-col pr-4  border-border-light">
              <span className="font-display font-bold text-xs uppercase text-text-main">User ID</span>
              <span className="font-mono text-sm mt-1">174852</span>
            </div>
            <div className="flex flex-col pr-4 border-border-light">
              <span className="font-display font-bold text-xs uppercase text-text-main">Date</span>
              <span className="font-sans text-sm mt-1">October 12, 2023</span>
            </div>
            <div className="flex flex-col pr-4  border-border-light">
              <span className="font-display font-bold text-xs uppercase text-text-main">Odometer</span>
              <span className="font-mono text-sm mt-1">2450 KM</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xs uppercase text-text-main">TotalTime</span>
              <span className="font-mono text-sm mt-1">68 H</span>
            </div>
          </section>
          <section className="flex flex-col gap-2" data-purpose="service-summary">
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-4xl sm:text-3xl text-brand">$85.00</span>
              <span className="font-sans text-lg text-text-main">Total</span>
            </div>
          </section>
          <section className="flex flex-col gap-4" data-purpose="detailed-tasks">
            <h3 className="font-display font-bold text-lg uppercase text-brand border-b border-border-brand pb-2">
              Detailed Service Tasks
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border-light text-text-main">
                    <th className="font-display font-bold uppercase py-2 pr-4 min-w-[120px]">Task</th>
                    <th className="font-display font-bold uppercase py-2 pr-4 min-w-[200px]">Details &amp; Notes</th>
                    <th className="font-display font-bold uppercase py-2 pr-4 min-w-[150px]">Components</th>
                    <th className="font-display font-bold uppercase py-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="font-sans text-text-main">
                  <tr className="border-b border-border-light">
                    <td className="py-3 pr-4 align-top">Brake Bleed</td>
                    <td className="py-3 pr-4 align-top">Dot 5.1 fluid replaced. Lever stroke adjusted for instant bite.</td>
                    <td className="py-3 pr-4 align-top">
                      Brakes: SRAM Red Rotors,
                      <br />
                      Caliper: Shimano XT 4554
                    </td>
                    <td className="py-3 align-top text-right font-mono">$60.00</td>
                  </tr>
                  <tr className="border-b border-border-light">
                    <td className="py-3 pr-4 align-top">Tire Sealant Refresh</td>
                    <td className="py-3 pr-4 align-top">60ml added per tire. Valve cores cleaned and inspected.</td>
                    <td className="py-3 pr-4 align-top">Orange Seal Endurance</td>
                    <td className="py-3 align-top text-right font-mono">$25.00</td>
                  </tr>
                  <tr className="border-b border-border-light">
                    <td className="py-3 pr-4 align-top">Chain Lubrication</td>
                    <td className="py-3 pr-4 align-top">Full degrease and wax application for minimum friction.</td>
                    <td className="py-3 pr-4 align-top">CeramicSpeed UFO Drip</td>
                    <td className="py-3 align-top text-right font-display font-bold uppercase">
                      No
                      <br />
                      Charge
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section className="flex flex-col gap-2" data-purpose="observations">
            <h3 className="font-display font-bold text-lg uppercase text-brand">Notes</h3>
            <text className="font-sans text-sm text-text-main whitespace-pre-line">
              Standard maintenance performed. Rear pad wear: 40% remaining Chain checked for stretch: 0.25mm (Within
              tolerance).
            </text>
          </section>
          <section className="flex flex-col gap-2" data-purpose="attachments">
            <h3 className="font-display font-bold text-lg uppercase text-brand">Attachments</h3>
            <ul className="list-disc list-inside font-sans text-sm text-text-main">
              <li>FAKTURA.PDF (1.2MB)</li>
            </ul>
          </section>
          <footer className="mt-8 pt-8 flex flex-col gap-4 text-sm" data-purpose="report-footer">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1 flex items-end">
                <span className="mr-2">Signature:</span>
                <div className="flex-1 border-b border-text-main h-4"></div>
              </div>
            </div>
            <div className="text-center sm:text-left mt-2">
              BikeCheck Contact Info (e.g., bikecheck.com | contact@bikecheck.com)
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default ServiceReportA4;
