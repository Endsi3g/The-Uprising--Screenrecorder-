import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

export const initAnalytics = () => {
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false, // Disable autocapture to be privacy-respectful
      capture_pageview: false,
      persistence: 'localStorage',
    });
    console.log('[Analytics] PostHog initialized');
  } else {
    console.warn('[Analytics] PostHog Key missing; tracking disabled');
  }
};

export const trackEvent = (name: string, properties?: Record<string, any>) => {
  if (POSTHOG_KEY) {
    posthog.capture(name, properties);
  }
};

export const identifyUser = (distinctId: string, properties?: Record<string, any>) => {
  if (POSTHOG_KEY) {
    posthog.identify(distinctId, properties);
  }
};
