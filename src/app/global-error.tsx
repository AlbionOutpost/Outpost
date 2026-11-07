"use client";
import { inter, barlowCondensed, barlowDisplay, geistMono } from "./fonts";
import { SystemPage } from "@/components/system-page";
import "./globals.css";
import "./product-system.css";

/** Shown when the root layout itself fails, so it brings its own document, fonts and backdrop. */
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${barlowCondensed.variable} ${barlowDisplay.variable} ${geistMono.variable}`}
      >
        <title>Outpost is unavailable</title>
        <div className="app outpost">
          <div className="main">
            <div className="site-backdrop" aria-hidden="true" />
            <div className="page-frame">
              <main id="main-content">
                <SystemPage
                  eyebrow="Outpost"
                  emblem="status-error"
                  title={
                    <>
                      Outpost is <em>down</em> for a moment
                    </>
                  }
                  line="The site could not start this page. Nothing you saved has changed. Try again in a minute."
                  actions={
                    <>
                      <button type="button" className="button primary" onClick={() => retry()}>
                        Try again
                      </button>
                      {/* A full page load: the app's own router is what failed */}
                      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                      <a className="button secondary" href="/">
                        Go to the home page
                      </a>
                    </>
                  }
                />
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
