
'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast.tsx';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface CameraScannerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: string) => void;
}

export function CameraScanner({ isOpen, onOpenChange, onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  useEffect(() => {
    let controls: any;

    const startScanner = async () => {
      if (isOpen && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          videoRef.current.srcObject = stream;

          controls = await codeReader.current.decodeFromStream(stream, videoRef.current, (result, error) => {
            if (result) {
              onScan(result.getText());
              // Stop the stream after a successful scan
              stream.getTracks().forEach(track => track.stop());
            }
            if (error && !(error instanceof NotFoundException)) {
              console.error('Barcode scan error:', error);
            }
          });

        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use the scanner.',
          });
          onOpenChange(false);
        }
      }
    };

    if (isOpen) {
      startScanner();
    }

    return () => {
      if (controls) {
        controls.stop();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      codeReader.current.reset();
    };
  }, [isOpen, onOpenChange, onScan]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Point your camera at a barcode to add the product to your cart.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-8">
                <div className="h-0.5 bg-red-500/70" />
            </div>
            {hasCameraPermission === false && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Please allow camera access to use this feature.
                  </AlertDescription>
                </Alert>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
