'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Timer, Flame, UtensilsCrossed } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface CooksModeProps {
  recipe: {
    id: string;
    name: string;
    image: string;
  };
  onClose: () => void;
}

export function CooksMode({ recipe, onClose }: CooksModeProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Mock steps for prototype
  const steps = [
    {
      title: 'Prep the Base',
      instruction:
        'Finely dice 2 onions and 3 cloves of garlic. Sauté in olive oil until translucent.',
    },
    {
      title: 'Brown the Meat',
      instruction:
        'Add 500g of ground beef. Cook until browned, breaking up clumps with a wooden spoon.',
    },
    {
      title: 'Simmer Sauce',
      instruction:
        'Stir in tomato paste and crushed tomatoes. Season with oregano, salt, and pepper. Simmer for 20 mins.',
    },
    {
      title: 'Layer and Bake',
      instruction:
        'Layer pasta sheets with sauce and béchamel. Top with mozzarella. Bake at 200°C for 30 mins.',
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="cooks-mode-overlay"
      className="fixed inset-0 z-[100] bg-cream flex flex-col"
    >
      {/* Header */}
      <div className="p-8 flex items-center justify-between border-b border-charcoal/5 bg-white/50 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-2xl overflow-hidden relative border-2 border-white shadow-md">
            <Image src={recipe.image} alt={recipe.name} fill className="object-cover" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-terracotta/60">
              Cook&apos;s mode
            </p>
            <h2 className="text-xl font-heading font-black text-charcoal">{recipe.name}</h2>
          </div>
        </div>
        <button
          data-testid="close-cooks-mode"
          onClick={onClose}
          className="p-4 rounded-full bg-charcoal/5 text-charcoal/40 active:scale-90 transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="flex w-full h-2 bg-charcoal/5">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              backgroundColor: i <= currentStep ? 'rgba(205, 93, 69, 1)' : 'rgba(0, 0, 0, 0.05)',
            }}
            className="flex-1"
          />
        ))}
      </div>

      {/* Main Instruction Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="max-w-xl"
          >
            <div className="mb-10 inline-flex items-center space-x-2 text-terracotta bg-terracotta/5 px-6 py-3 rounded-full">
              <UtensilsCrossed size={20} />
              <span className="text-sm font-black uppercase tracking-widest">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>

            <h3 className="text-3xl font-heading font-black text-charcoal mb-8 leading-tight">
              {steps[currentStep].title}
            </h3>

            <p className="text-2xl font-medium text-charcoal/60 leading-relaxed">
              {steps[currentStep].instruction}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-8 grid grid-cols-2 gap-6 bg-white/50 backdrop-blur-md border-t border-charcoal/5">
        <Button
          variant="secondary"
          disabled={currentStep === 0}
          onClick={prevStep}
          className="h-24 rounded-3xl border-charcoal/10 text-charcoal/40 text-xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-all"
        >
          <ChevronLeft size={32} />
          <span>Back</span>
        </Button>
        <Button
          onClick={nextStep}
          className="h-24 rounded-3xl bg-terracotta text-white text-xl font-bold flex items-center justify-center space-x-3 shadow-xl shadow-terracotta/20 active:scale-95 transition-all"
        >
          <span>{currentStep === steps.length - 1 ? 'Done' : 'Next'}</span>
          <ChevronRight size={32} />
        </Button>
      </div>

      {/* Footer Info */}
      <div className="px-8 py-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/20">
        <div className="flex items-center space-x-2">
          <Timer size={14} />
          <span>45 mins total</span>
        </div>
        <div className="flex items-center space-x-2">
          <Flame size={14} />
          <span>Medium heat</span>
        </div>
      </div>
    </motion.div>
  );
}
