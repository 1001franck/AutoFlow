/// <reference types="vite/client" />

// Déclare les fichiers .lottie comme des modules retournant une URL string
declare module '*.lottie' {
  const src: string;
  export default src;
}
