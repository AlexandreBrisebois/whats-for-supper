'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SolarLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function SolarLoader({ className, size = 'md', label }: SolarLoaderProps) {
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-24 w-24',
    lg: 'h-40 w-40',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        {/* Core Sun */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-ochre to-terracotta blur-md"
        />

        {/* Outer Glow 1 */}
        <motion.div
          animate={{
            scale: [1.2, 1.4, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
          className="absolute inset-0 rounded-full bg-ochre/30 blur-xl"
        />

        {/* Outer Glow 2 */}
        <motion.div
          animate={{
            scale: [1.4, 1.8, 1.4],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute inset-0 rounded-full bg-terracotta/20 blur-2xl"
        />

        {/* Subtle Wobble Core */}
        <motion.div
          animate={{
            rotate: [0, 90, 180, 270, 360],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-2/3 w-2/3 rounded-full bg-white/10 blur-xl" />
        </motion.div>
      </div>

      {label && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm font-bold tracking-[0.2em] uppercase text-charcoal/40"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
