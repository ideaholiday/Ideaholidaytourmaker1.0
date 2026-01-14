
import { useBrandContext } from '../context/BrandContext';

export const useClientBranding = () => {
  const { branding, isPlatformDefault } = useBrandContext();

  return {
    ...branding,
    isPlatformDefault,
    // Helper for dynamic styles
    styles: {
      primaryBg: { backgroundColor: branding.primaryColor },
      primaryText: { color: branding.primaryColor },
      primaryBorder: { borderColor: branding.primaryColor },
      secondaryBg: { backgroundColor: branding.secondaryColor },
      secondaryText: { color: branding.secondaryColor },
      button: {
        backgroundColor: branding.primaryColor,
        color: '#ffffff', // Assuming light text on primary
      }
    }
  };
};
