export const tenantConfig = {
  // Brand Names
  name: "Plenum - Sistema de Gestión",
  shortName: "Plenum",
  company: "Plenum",
  description: "Sistema de gestión integral y expediente clínico veterinario",
  
  // Logos (URLs)
  logo: {
    light: "/vite.svg", // Cambiar por ruta real del logo
    dark: "/vite.svg",  // Cambiar por ruta real del logo en dark mode
    sidebar: "/vite.svg",
  },
  
  // Contact info
  support: {
    email: "soporte@plenum.com",
    phone: "+52 123 456 7890",
  },
  
  // Theming Colors (oklch format)
  // For a new tenant, just adjust the 'primary' color. 
  // The current value is "Clinical Blue"
  colors: {
    light: {
      primary: "0.55 0.12 250",
    },
    dark: {
      primary: "0.65 0.15 250",
    }
  }
};
