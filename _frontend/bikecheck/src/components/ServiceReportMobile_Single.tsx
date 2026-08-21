import logoDark from "../assets/icons/bikecheck/Logo_dark.svg";
import { Paperclip, Wrench, NotepadText } from "lucide-react";

function ServiceReportMobileSingle() {
  return (
    <>
      <div className="antialiased min-h-screen py-4 px-0 sm:py-8 sm:px-4 flex justify-center">
        <main
          className="w-full max-w-3xl text-left bg-white rounded-none sm:rounded-sm report-container overflow-hidden"
          data-purpose="document-preview"
        >
          <div className="p-4 sm:p-10 flex flex-col gap-6 sm:gap-8">
            <header>
              <div className="flex flex-col items-center gap-1">
                <img src={logoDark} alt="BikeCheck" className="h-10 w-auto" />
                <span className="font-display font-bold text-s uppercase text-text-muted mt-1">Single Service Report</span>
              </div>
            </header>
            <section className="pb-6 flex flex-col gap-6" data-purpose="meta-info">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <span className="font-display font-bold text-xs uppercase text-text-main">Bike</span>
                  <span className="font-sans text-sm mt-1">Pivot Firebird XT/PRO</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-display font-bold text-xs uppercase text-text-main">user email</span>
                  <span className="font-mono text-sm mt-1 break-all">jaroslav.lufinka@gmail.com</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-bold text-xs uppercase text-text-main">Service ID</span>
                  <span className="font-mono text-sm mt-1">456789</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-bold text-xs uppercase text-text-main">Service Date</span>
                  <span className="font-sans text-sm mt-1">October 12, 2023</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-bold text-xs uppercase text-text-main">Odometer</span>
                  <span className="font-mono text-sm mt-1">2450 KM</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-xs uppercase text-text-main">Total</span>
                  <span className="font-mono text-sm mt-1 text-branddark">$82.00</span>
                </div>
              </div>
            </section>
            <section className="flex flex-col gap-4" data-purpose="detailed-tasks">
              <div className="flex items-center gap-2 text-main border-b border-border-light pb-4">
                <Wrench />
                <h3 className="font-bold text-lg uppercase text-main">Service Events</h3>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-sm bg-white/50 flex flex-col gap-3 border-b border-border-light pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-display font-bold text-base text-text-main">Brake Bleed</h4>
                    <span className="font-mono text-base font-semibold">$60.00</span>
                  </div>
                  <div className="flex-grow">
                    <p className="font-sans text-sm text-text-main">
                      Dot 5.1 fluid replaced. Lever stroke adjusted for instant bite.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="bg-brand/15 text-text-main font-display font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        Brakes: SRAM Red Rotors
                      </span>
                      <span className="bg-brand/20 text-text-main font-display font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        Caliper: Shimano XT 4554
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-sm bg-white/50 flex flex-col gap-3 border-b border-border-light pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-display font-bold text-base text-text-main">Tire Sealant Refresh</h4>
                    <span className="font-mono text-base font-semibold">$20.00</span>
                  </div>
                  <div className="flex-grow">
                    <p className="font-sans text-sm text-text-main">
                      60ml added per tire. Valve cores cleaned and inspected.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="bg-brand/20 text-text-main font-display font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        TIRE: Maxxis Assegai DD
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-sm bg-white/50 flex flex-col gap-3 border-b border-border-light pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-display font-bold text-base text-text-main">Chain Lubrication</h4>
                    <span className="font-mono text-base font-semibold">$60.00</span>
                  </div>
                  <div className="flex-grow">
                    <p className="font-sans text-sm text-text-main">
                      Full degrease and wax application for minimum friction.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="bg-brand/20 text-brand font-display font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        Chain: CeramicSpeed UFO Drip
                      </span>
                      <span className="bg-brand/20 text-text-main font-display font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        Caliper: Shimano XT 4554
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section className="flex flex-col gap-2 mt-4" data-purpose="observations">
              <div className="flex items-center gap-2 textmain ">
                <NotepadText />
                <h3 className="font-display font-bold text-lg uppercase">Notes</h3>
              </div>
              <text className="font-sans text-sm text-text-main whitespace-pre-line">
                Standard maintenance performed. Rear pad wear: 40% remaining. Chain check stretch: 0.25mm (Within tolerance).
              </text>
            </section>
            <section className="flex flex-col gap-2 mt-2" data-purpose="attachments">
              <div className="flex items-center gap-2 text-main">
                <Paperclip />
                <h3 className="font-display font-bold text-lg uppercase ">Attachments</h3>
              </div>
              <ul className="list-disc list-inside font-sans text-sm text-text-main">
                <li className="py-1">FAKTURA.PDF (1.2MB)</li>
              </ul>
            </section>
            <footer className="mt-6 pt-6 flex flex-col gap-6 text-sm" data-purpose="report-footer">
              <div className="flex flex-col gap-6">
                <div className="w-full md:w-1/2 flex flex-col gap-2">
                  <div className="border-b border-text-main pb-2 w-full h-6 flex items-end mt-10">
                    <span className="text-text-muted">Signature:</span>
                  </div>
                </div>
              </div>
              <div className="text-center mt-4 text-xs text-text-muted">
                BikeCheck Contact Info
                <br />
                bikecheck.cloud | contact@bikecheck.com
              </div>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}

export default ServiceReportMobileSingle;
