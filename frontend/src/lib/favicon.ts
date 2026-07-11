export function adaptFavicon() {
  // Check if dark mode is active via class or system preference
  const isDark = document.documentElement.classList.contains('dark') || 
                 (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const setFavicon = (url: string) => {
    const links = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
    links.forEach(link => {
      (link as HTMLLinkElement).href = url;
    });
  };

  const img = new Image();
  img.src = `${import.meta.env.BASE_URL}supplymind-logo.jpg`;
  
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 32;
      canvas.height = img.height || 32;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setFavicon(`${import.meta.env.BASE_URL}supplymind-logo.jpg`);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        // Calculate color distance from pure white
        const distFromWhite = Math.sqrt(
          Math.pow(255 - r, 2) + 
          Math.pow(255 - g, 2) + 
          Math.pow(255 - b, 2)
        );
        
        // Remove white background with smooth anti-aliased edges
        if (distFromWhite < 25) {
          data[i+3] = 0; // Fully transparent
        } else if (distFromWhite < 75) {
          data[i+3] = Math.floor((distFromWhite - 25) * (255 / 50)); // Semi-transparent edge
        }
        
        // Adaptive: If dark mode, boost brightness/vibrancy so it pops on dark tabs
        if (isDark && data[i+3] > 0) {
          data[i] = Math.min(255, r * 1.5);
          data[i+1] = Math.min(255, g * 1.5);
          data[i+2] = Math.min(255, b * 1.5);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      setFavicon(dataUrl);
    } catch (e) {
      console.warn("Favicon adaptation failed, fallback to original image", e);
      setFavicon(`${import.meta.env.BASE_URL}supplymind-logo.jpg`);
    }
  };

  img.onerror = () => {
    setFavicon(`${import.meta.env.BASE_URL}supplymind-logo.jpg`);
  };
}

// Automatically re-run when theme changes (observing class changes on the html element)
export function initFaviconAdapter() {
  adaptFavicon();
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'class') {
        adaptFavicon();
      }
    }
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
}
