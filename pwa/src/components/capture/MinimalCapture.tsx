'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Image as ImageIcon, CheckCircle2, Loader2, X, Star } from 'lucide-react';
import { useCapture } from '@/hooks/useCapture';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants/routes';

export default function MinimalCapture() {
  const router = useRouter();
  const {
    images,
    addImage,
    removeImage,
    isSubmitting,
    submitRecipe,
    clearError,
    error,
    rating,
    setRating,
    notes,
    setNotes,
    selectedDishPhotoIndex,
    setSelectedDishPhotoIndex,
  } = useCapture();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const saveAreaRef = useRef<HTMLDivElement>(null);

  const [onSuccess, setOnSuccess] = useState(false);

  useEffect(() => {
    if (images.length > 0) {
      const timer = setTimeout(() => {
        saveAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [images.length]);

  useEffect(() => {
    if (onSuccess) {
      const timer = setTimeout(() => {
        router.push(ROUTES.HOME);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [onSuccess, router]);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleGallery = () => {
    galleryInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => addImage(file));
    e.target.value = ''; // Reset
  };

  const handleSave = async () => {
    const id = await submitRecipe();
    if (id) {
      setOnSuccess(true);
    }
  };

  if (onSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sage/10 text-sage ring-8 ring-sage/5">
          <CheckCircle2 size={48} />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-charcoal">
            Captured!
          </h2>
          <p className="text-charcoal/60">Your recipe is safe in the library.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push(ROUTES.HOME)}
          className="rounded-2xl px-8"
        >
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Capture Area */}
      <div className="flex flex-col items-center gap-6 rounded-[3rem] bg-terracotta/[0.03] border-2 border-dashed border-terracotta/10 p-12 text-center transition-colors hover:bg-terracotta/[0.05]">
        <button
          type="button"
          onClick={handleCapture}
          aria-label="Take a photo"
          className="flex h-28 w-28 items-center justify-center rounded-full bg-terracotta text-white shadow-xl shadow-terracotta/30 ring-4 ring-white active:scale-95 transition-transform"
        >
          <Camera size={40} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={handleGallery}
          className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-terracotta/60 transition-colors hover:text-terracotta"
        >
          <ImageIcon size={16} />
          Pick from Gallery
        </button>

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Preview Area */}
      {images.length > 0 && (
        <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-heading text-lg font-bold text-charcoal">
              Photos ({images.length})
            </h3>
            <button
              onClick={() => images.forEach((_, i) => removeImage(0))}
              className="text-[10px] font-bold uppercase tracking-widest text-terracotta/40"
            >
              Clear All
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            {images.map((file, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedDishPhotoIndex(idx)}
                className={`group relative h-28 w-28 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl shadow-sm ring-2 transition-all active:scale-95 ${idx === selectedDishPhotoIndex ? 'ring-terracotta scale-105 z-10 shadow-lg' : 'ring-terracotta/5'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt="Capture preview"
                  className="h-full w-full object-cover"
                />

                {/* Delete Button - use stopPropagation to avoid triggering selection when deleting */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal/80 text-white backdrop-blur-sm transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                >
                  <X size={14} />
                </button>

                {/* Star Selection Icon - now just an indicator since the whole card is clickable */}
                <div
                  className={`absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all ${idx === selectedDishPhotoIndex ? 'bg-terracotta text-white shadow-lg scale-110 opacity-100' : 'opacity-0 bg-white/60 text-charcoal/20'}`}
                >
                  <Star
                    size={16}
                    fill={idx === selectedDishPhotoIndex ? 'currentColor' : 'none'}
                    strokeWidth={idx === selectedDishPhotoIndex ? 0 : 2}
                  />
                </div>

                {idx === selectedDishPhotoIndex && (
                  <div className="absolute bottom-0 left-0 right-0 bg-terracotta/90 py-1 text-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white">
                      Main Dish
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Appreciation & Notes */}
          <div className="flex flex-col gap-6 mt-2">
            <div className="flex flex-col gap-3 px-2">
              <label className="text-sm font-bold text-charcoal/80">Appreciation</label>
              <div className="flex gap-2">
                {[
                  { value: 1, label: 'Not for me', icon: '👎' },
                  { value: 2, label: 'It was OK', icon: '👍' },
                  { value: 3, label: 'Loved it!', icon: '💚' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRating(opt.value as any)}
                    className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl p-4 border-2 transition-all ${rating === opt.value ? 'border-terracotta bg-terracotta/5 text-terracotta scale-100 shadow-sm' : 'border-charcoal/5 bg-white text-charcoal/50 hover:bg-charcoal/5 scale-[0.98]'}`}
                  >
                    <span className="text-2xl leading-none">{opt.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 px-2">
              <label className="text-sm font-bold text-charcoal/80">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any tweaks for next time?"
                className="w-full rounded-3xl border-2 border-charcoal/10 bg-white p-5 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-terracotta focus:outline-none focus:ring-4 focus:ring-terracotta/10 min-h-[120px] resize-none transition-all"
              />
            </div>
          </div>

          <div ref={saveAreaRef}>
            <Button
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              onClick={handleSave}
              className="mt-4 rounded-[2rem] py-6 text-lg font-bold shadow-xl shadow-terracotta/20"
            >
              Save Recipe
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="px-4 text-center text-sm font-medium text-pink animate-in shake duration-300">
          {error}
        </p>
      )}
    </div>
  );
}
