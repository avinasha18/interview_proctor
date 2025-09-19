// Utility function to get the backend URL with proper fallbacks
export const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  
  // Debug logging
  console.log('Environment VITE_BACKEND_URL:', envUrl);
  console.log('Current hostname:', window.location.hostname);
  
  // Check if environment variable is valid
  if (envUrl && envUrl !== 'undefined' && envUrl !== '' && envUrl !== 'null') {
    console.log('Using environment URL:', envUrl);
    return envUrl;
  }
  
  // Fallback based on hostname
  if (window.location.hostname === 'interview-proctor-system.vercel.app') {
    const fallbackUrl = 'https://interview-proctor-server.vercel.app';
    console.log('Using Vercel fallback URL:', fallbackUrl);
    return fallbackUrl;
  }
  
  // Local development fallback
  const localUrl = 'http://localhost:3001';
  console.log('Using local development URL:', localUrl);
  return localUrl;
};

// Export the backend URL
export const BACKEND_URL = getBackendUrl();

// Debug logging
console.log('Final BACKEND_URL:', BACKEND_URL);
