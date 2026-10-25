'use client';

import type { ComponentProps } from 'react';
import MinimalCapture from './MinimalCapture';
import { PdfCapturePanel } from './PdfCapturePanel';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
import { DemoAiActionGate } from '@/components/demo/DemoAiActionGate';

const resetPhotos = () => {}; // MinimalCapture resets its own photo draft when a PDF is selected.
export default function CaptureWithPdf(props: ComponentProps<typeof MinimalCapture>) {
  return (
    <DemoAiActionGate>
      <CaptureInputs {...props} />
    </DemoAiActionGate>
  );
}

function CaptureInputs(props: ComponentProps<typeof MinimalCapture>) {
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
