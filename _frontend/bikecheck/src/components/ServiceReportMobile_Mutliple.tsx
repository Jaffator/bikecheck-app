import logoDark from "../assets/icons/bikecheck/Logo_dark.svg";

function ServiceReportMobileMultiple() {
  return (
    <div className="antialiased min-h-screen py-4 px-0 sm:py-8 sm:px-4 flex justify-center">
      <main
        className="w-full max-w-3xl text-left bg-white rounded-none sm:rounded-sm report-container overflow-hidden"
        data-purpose="document-preview"
      >
        <div className="p-4 sm:p-10 flex flex-col gap-6 sm:gap-8">
          <header>
            <div className="flex flex-col items-center gap-1">
              <img src={logoDark} alt="BikeCheck" className="h-10 w-auto" />
              <span className="font-display font-bold text-s uppercase text-text-muted mt-1">Multiple Service Report</span>
            </div>
          </header>

          <section className="pb-6 flex flex-col gap-6" data-purpose="meta-info">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col">
                <span className="font-display font-bold text-xs uppercase text-text-main">Bike</span>
                <span className="font-sans text-sm mt-1">Crux Gravel</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-xs uppercase text-text-main">user email</span>
                <span className="font-mono text-sm mt-1 break-all">jaroslav.lufinka@gmail.com</span>
              </div>

              <div className="flex flex-col">
                <span className="font-display font-bold text-xs uppercase text-text-main">Odometer</span>
                <span className="font-mono text-sm mt-1">2450 KM</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xs uppercase text-text-main">Generated</span>
                <span className="font-sans text-sm mt-1">Oct 24, 2023</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xs uppercase text-text-main">Reported period</span>
                <span className="font-sans text-sm mt-1">Oct, 2023 - Sep, 2024</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xs uppercase text-text-main">Total</span>
                <span className="font-mono text-sm mt-1 text-brand">$1,482.00</span>
              </div>
            </div>
          </section>
          <section className="flex flex-col gap-8" data-purpose="service-timeline">
            <div className="flex flex-col">
              <h3 className="font-display font-bold text-lg uppercase text-branddark border-b border-border-brand pb-2 mb-2">
                2023
              </h3>
              <div className="flex flex-col">
                <div className="break-inside-avoid flex justify-between items-start gap-4 py-3">
                  <div className="w-20 shrink-0">
                    <span className="font-mono text-sm text-text-muted">Oct 12</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-display font-bold text-base text-text-main">
                      Tire Sealant Refresh, Chain Lubrication, Pressure Check
                    </h4>
                    <p className="font-sans text-sm text-text-main mt-0.5">
                      60ml Orange Seal added per tire. Valve cores cleaned. Chain degreased and waxed.
                    </p>
                    <div className="mt-2 flex">
                      <span className="bg-brand/10 text-text-main font-display font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        TIRE: Maxxis Assegai DD
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-semibold text-text-main">$25.00</span>
                  </div>
                </div>
                <div className="break-inside-avoid flex justify-between items-start gap-4 py-3 border-t border-border-light">
                  <div className="w-20 shrink-0">
                    <span className="font-mono text-sm text-text-muted">Oct 05</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-display font-bold text-base text-text-main">Chain Lubrication</h4>
                    <p className="font-sans text-sm text-text-main mt-0.5">
                      Quick wipe and re-lube before race weekend. CeramicSpeed UFO Drip.
                    </p>
                    <div className="mt-2 flex">
                      <span className="bg-brand/10 text-text-main font-display font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        TIRE: Maxxis Assegai DD
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display font-bold uppercase text-sm text-text-muted">No Charge</span>
                  </div>
                </div>
                <div className="break-inside-avoid flex justify-between items-start gap-4 py-3 border-t border-border-light">
                  <div className="w-20 shrink-0">
                    <span className="font-mono text-sm text-text-muted">Sep 28</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-display font-bold text-base text-text-main">Brake Bleed</h4>
                    <p className="font-sans text-sm text-text-main mt-0.5">
                      Dot 5.1 fluid replaced. Lever stroke adjusted for instant bite. Brakes: SRAM Red.
                    </p>
                    <div className="mt-2 flex">
                      <span className="bg-brand/10 text-text-main font-display font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        TIRE: Maxxis Assegai DD
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-semibold text-text-main">$60.00</span>
                  </div>
                </div>
                <div className="break-inside-avoid flex justify-between items-start gap-4 py-3 border-t border-border-light">
                  <div className="w-20 shrink-0">
                    <span className="font-mono text-sm text-text-muted">Sep 15</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-display font-bold text-base text-text-main">Cassette Replacement</h4>
                    <p className="font-sans text-sm text-text-main mt-0.5">
                      Replaced worn SRAM Force 10-36T cassette. Indexing adjusted.
                    </p>
                    <div className="mt-2 flex">
                      <span className="bg-brand/10 text-text-main font-display font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        TIRE: Maxxis Assegai DD
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-semibold text-text-main">$120.00</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="font-display font-bold text-lg uppercase text-branddark border-b border-border-brand pb-2 mb-2">
                2022
              </h3>
              <div className="flex flex-col">
                <div className="break-inside-avoid flex justify-between items-start gap-4 py-3">
                  <div className="w-20 shrink-0">
                    <span className="font-mono text-sm text-text-muted">Nov 20</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-display font-bold text-base text-text-main">Full Winter Overhaul</h4>
                    <p className="font-sans text-sm text-text-main mt-0.5">
                      Complete strip and rebuild. All bearings checked/re-greased. Cables replaced.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-semibold text-text-main">$250.00</span>
                  </div>
                </div>
                <div className="break-inside-avoid flex justify-between items-start gap-4 py-3 border-t border-border-light">
                  <div className="w-20 shrink-0">
                    <span className="font-mono text-sm text-text-muted">Jun 10</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-display font-bold text-base text-text-main">Fork Service (50hr)</h4>
                    <p className="font-sans text-sm text-text-main mt-0.5">
                      Lower leg service on suspension fork. Seals and oil replaced.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-semibold text-text-main">$85.00</span>
                  </div>
                </div>
                <div className="break-inside-avoid flex justify-between items-start gap-4 py-3 border-t border-border-light">
                  <div className="w-20 shrink-0">
                    <span className="font-mono text-sm text-text-muted">Mar 05</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-display font-bold text-base text-text-main">Bottom Bracket Replacement</h4>
                    <p className="font-sans text-sm text-text-main mt-0.5">
                      Removed creaking DUB BB. Installed new standard DUB bottom bracket.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-semibold text-text-main">$65.00</span>
                  </div>
                </div>
                <div className="break-inside-avoid flex justify-between items-start gap-4 py-3 border-t border-border-light">
                  <div className="w-20 shrink-0">
                    <span className="font-mono text-sm text-text-muted">Jun 10</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-display font-bold text-base text-text-main">Fork Service (50hr)</h4>
                    <p className="font-sans text-sm text-text-main mt-0.5">
                      Lower leg service on suspension fork. Seals and oil replaced.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-semibold text-text-main">$85.00</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <footer
            className="mt-6 pt-6 flex flex-col gap-6 text-sm border-t border-border-light"
            data-purpose="report-footer"
          >
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="w-full md:w-1/2 flex flex-col gap-2">
                <div className="border-b border-text-main pb-2 w-full h-6 flex items-end mt-10">
                  <span className="text-text-muted">Signature:</span>
                </div>
              </div>
            </div>
            <div className="text-center mt-4 text-xs text-text-muted">
              BikeCheck Certified Maintenance • bikecheck.cloud • contact@bikecheck.com
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default ServiceReportMobileMultiple;
