/// <reference types="vite/client" />

interface Window {
    zaraz: {
        consent: {
            set: (consent: Record<string, boolean>) => void;
        };
        track: (eventName: string, parameters?: Record<string, unknown>) => void;
    };
}
