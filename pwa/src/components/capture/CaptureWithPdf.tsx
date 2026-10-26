'use client';

import type { ComponentProps } from 'react';
import MinimalCapture from './MinimalCapture';
import { PdfCapturePanel } from './PdfCapturePanel';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
import { DemoAiActionGate } from '@/components/demo/DemoAiActionGate';
import { useDemoMode } from '@/components/demo/DemoModeProvider';

const resetPhotos = () => {}; // MinimalCapture resets its own photo draft when a PDF is selected.
export default function CaptureWithPdf(props: ComponentProps<typeof MinimalCapture>) {
  return <CaptureInputs {...props} />;
}

function CaptureInputs(props: ComponentProps<typeof MinimalCapture>) {
  const { mode } = useDemoMode();
  const selection = usePdfCaptureStore((state) => state.selection);
  return (
    <>
      {mode === false ? (
        <PdfCapturePanel isGoto={props.intent === 'goto'} resetPhotos={resetPhotos} />
      ) : (
        <DemoAiActionGate>{null}</DemoAiActionGate>
      )}
      <div hidden={mode === false && Boolean(selection)}>
        <MinimalCapture {...props} preparedOnly={mode !== false} />
      </div>
    </>
  );
}
