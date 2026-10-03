'use client';

import type { ComponentProps } from 'react';
import MinimalCapture from './MinimalCapture';
import { PdfCapturePanel } from './PdfCapturePanel';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';

const resetPhotos = () => {}; // MinimalCapture resets its own photo draft when a PDF is selected.
export default function CaptureWithPdf(props: ComponentProps<typeof MinimalCapture>) {
  const selection = usePdfCaptureStore((state) => state.selection);
  return (
    <>
      <PdfCapturePanel isGoto={props.intent === 'goto'} resetPhotos={resetPhotos} />
      <div hidden={Boolean(selection)}>
        <MinimalCapture {...props} />
      </div>
    </>
  );
}
