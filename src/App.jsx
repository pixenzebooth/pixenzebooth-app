import React, { Suspense, lazy, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { HelmetProvider } from 'react-helmet-async';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AlertProvider } from './context/AlertContext';
import { ThemeProvider } from './context/ThemeContext';
import { LicenseProvider, useLicense } from './context/LicenseContext';
import { TenantProvider } from './context/TenantContext';
import { EventProvider, useEvent } from './context/EventContext';

function lazyRetry(importFn, retriesLeft = 3, interval = 1500) {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attempt = (left) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (left <= 0) {
              reject(error);
              return;
            }
            setTimeout(() => {
              attempt(left - 1);
            }, interval);
          });
      };
      attempt(retriesLeft);
    });
  });
}

const Home = lazyRetry(() => import('./pages/Home'));
const Booth = lazyRetry(() => import('./pages/Booth'));
const Result = lazyRetry(() => import('./pages/Result'));
const About = lazyRetry(() => import('./pages/About'));
const PrivacyPolicy = lazyRetry(() => import('./pages/PrivacyPolicy'));
const Preview = lazyRetry(() => import('./pages/Preview'));
const Contact = lazyRetry(() => import('./pages/Contact'));
const FrameCreator = lazyRetry(() => import('./pages/FrameCreator'));
const FrameSelection = lazyRetry(() => import('./pages/FrameSelection'));

const NotFound = lazyRetry(() => import('./pages/NotFound'));
const DeveloperProfile = lazyRetry(() => import('./pages/DeveloperProfile'));
const LicenseLogin = lazyRetry(() => import('./pages/LicenseLogin'));
const EventSelection = lazyRetry(() => import('./pages/EventSelection'));
const Gallery = lazyRetry(() => import('./pages/Gallery'));
const PhotoShare = lazyRetry(() => import('./pages/PhotoShare'));



const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center font-titan text-white text-xl animate-pulse">
    Loading...
  </div>
);

// Gate component that checks license status and active event
const LicenseGate = ({ children }) => {
  const { isLicensed, isValidating } = useLicense();
  const { hasActiveEvent } = useEvent();

  // Loading
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center font-titan text-white text-xl animate-pulse">
        Validating License...
      </div>
    );
  }

  // Not licensed → show login
  if (!isLicensed) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LicenseLogin />
      </Suspense>
    );
  }

  // Licensed but no event selected → show event selection
  if (!hasActiveEvent) {
    return (
      <Suspense fallback={<PageLoader />}>
        <EventSelection />
      </Suspense>
    );
  }

  return children;
};

const ErrorFallback = () => {
  const handleReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
    }
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white gap-6 p-6 text-center">
      <h1 className="text-2xl md:text-4xl font-titan text-game-accent">Something went wrong</h1>
      <p className="text-white/70 max-w-md font-nunito">
        This may be caused by a network issue or a stale cache. Click the button below to clear the cache and reload.
      </p>
      <button
        onClick={handleReload}
        className="px-8 py-3 bg-game-accent text-black font-titan text-lg rounded-xl border-4 border-black shadow-[4px_4px_0_#000] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] transition-all"
      >
        CLEAR CACHE & RELOAD
      </button>
    </div>
  );
};


function App() {
  useEffect(() => {
    // Force clear old aggressive caches from previous versions
    try {
      localStorage.removeItem('frames_cache');
      localStorage.removeItem('frames_cache_timestamp');
      localStorage.removeItem('cached_frames');
      localStorage.removeItem('cached_db_frames');
    } catch {
      // Ignore
    }

    // Force service worker to check for updates immediately on load
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update();
        });
      }).catch(() => { });
    }
  }, []);

  return (
    <HelmetProvider>
      <AlertProvider>
        <LicenseProvider>
          <TenantProvider>
            <EventProvider>
              <ThemeProvider>
                <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
                  <LicenseGate>
                    <AuthProvider>
                      <Router>
                        <a href="#main-content" className="skip-to-content">Skip to Main Content</a>
                        <main id="main-content" tabIndex="-1">
                          <Suspense fallback={<PageLoader />}>
                            <Routes>
                              <Route path="/" element={<Home />} />
                              <Route path="/select-frame" element={<FrameSelection />} />
                              <Route path="/booth" element={<Booth />} />
                              <Route path="/result" element={<Result />} />
                              <Route path="/preview" element={<Preview />} />
                              <Route path="/create-frame" element={<FrameCreator />} />
                              <Route path="/about" element={<About />} />
                              <Route path="/privacy" element={<PrivacyPolicy />} />
                              <Route path="/contact" element={<Contact />} />

                              <Route path="/developer-nanda" element={<DeveloperProfile />} />
                              <Route path="/gallery/:eventSlug" element={<Gallery />} />
                              <Route path="/share" element={<PhotoShare />} />

                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </main>
                      </Router>
                    </AuthProvider>
                  </LicenseGate>
                </Sentry.ErrorBoundary>
              </ThemeProvider>
            </EventProvider>
          </TenantProvider>
        </LicenseProvider>
      </AlertProvider>
    </HelmetProvider>
  );
}

export default App;
