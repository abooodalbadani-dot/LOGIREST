import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { getExportBranding } from './exportBranding';
import { PrintableReport, PDFColumn } from './PrintableReport';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api/client';
import { RestaurantProfileSchema } from '@/features/admin/hooks/useRestaurantProfile';
import { z } from 'zod';

export type { PDFColumn };

interface PDFExportOptions {
  scope?: string;
  generatedBy?: string;
  brandingConfig?: {
    logoUrl?: string;
    logoType: 'MARK' | 'BANNER';
    systemName?: string;
    logoSvgContent?: string;
  };
}

const PrintSettingsSchema = z.object({
  systemName: z.string().optional(),
  printSettings: z.object({
    showSystemName: z.boolean().optional(),
  }).optional(),
});

export async function generatePDF(
  columns: PDFColumn[],
  rows: Record<string, unknown>[],
  filename: string,
  title: string,
  options?: PDFExportOptions
) {
  // Create a container element
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  document.body.appendChild(container);

  let branding = getExportBranding();

  try {
    // Override with fresh DB data directly
    const [profile, settings] = await Promise.all([
      apiClient.get('/admin/restaurant-profile', RestaurantProfileSchema.partial()),
      apiClient.get('/admin/settings', PrintSettingsSchema.partial()),
    ]);
    const isFallbackLogo = !profile.logoUrl && !profile.logo && !branding?.logo;
    const finalLogo = profile.logoUrl || profile.logo || branding?.logo;

    branding = {
      name: profile.name || branding?.name || 'Otantik Restaurant Enterprise',
      address: profile.address || '',
      phone: profile.phone || '',
      email: profile.email || '',
      logo: profile.logoUrl || profile.logo || '',
      taxNumber: profile.taxNumber || '',
      commercialRegistration: profile.commercialRegistration || '',
    };

    // Inject dynamic branding config
    const showSystemName = settings.printSettings?.showSystemName ?? true;
    options = {
      ...options,
      brandingConfig: {
        logoType: profile.brandingConfig?.logoType || branding?.brandingConfig?.logoType || (isFallbackLogo ? 'BANNER' : 'MARK'),
        systemName: showSystemName ? (settings.systemName || branding.name) : '',
      }
    };
  } catch (err) {
    console.warn('Failed to fetch live profile/settings from DB for PDF, using cached or fallback', err);
  }

  let base64Logo = undefined;
  if (branding?.logo) {
    try {
      if (branding.logo.toLowerCase().endsWith('.svg') || branding.logo.startsWith('data:image/svg+xml')) {
        const res = await fetch(branding.logo);
        const svgText = await res.text();
        if (options && options.brandingConfig) {
          options.brandingConfig.logoSvgContent = svgText;
        }
      } else {
        const res = await fetch(branding.logo);
        const blob = await res.blob();
        base64Logo = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn('Failed to fetch logo', e);
    }
  }

  const finalBranding = branding ? { ...branding, logo: base64Logo || branding.logo } : undefined;

  const root = createRoot(container);

  const currentLang = typeof document !== 'undefined' ? (document.documentElement.lang === 'en' ? 'en' : 'ar') : 'ar';

  await new Promise<void>((resolve) => {
    root.render(
      React.createElement(PrintableReport, {
        columns,
        rows,
        title,
        options,
        branding: finalBranding,
        brandingConfig: options?.brandingConfig,
        lang: currentLang,
      })
    );
    // Give React time to render and browser time to paint/load fonts
    setTimeout(resolve, 800);
  });

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    let pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    // STRICT PREVENT EMPTY PAGE: If it's just slightly over one page (e.g., margin overflow), clip it.
    if (pdfHeight > pageHeight && pdfHeight < pageHeight + 5) {
      pdfHeight = pageHeight;
    }

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 1) { // > 1 to ignore fractional pixel differences
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}
