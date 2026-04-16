'use client';

import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Heart, X } from 'lucide-react';

interface DiscoveryCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  isFront: boolean;
  stackIndex: number;
  prepTime: string;
  difficulty: string;
  category: string;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  title,
  description,
  imageUrl,
  onSwipeRight,
  onSwipeLeft,
  isFront,
  stackIndex,
  prepTime,
  difficulty,
  category,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  
  // Indicators opacity
  const likeOpacity = useTransform(x, [40, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -40], [1, 0]);

  const controls = useAnimation();
  
  // Calculate stack depth effects
  const scale = 1 - stackIndex * 0.05;
  const yOffset = stackIndex * 15;
  const opacity = 1 - stackIndex * 0.3;

  useEffect(() => {
    if (isFront) {
      controls.start({ 
        x: 0, 
        rotate: 0, 
        scale: 1, 
        y: 0, 
        opacity: 1,
        transition: { type: 'spring', stiffness: 300, damping: 20 }
      });
    } else {
      controls.start({ 
        x: 0, 
        rotate: 0, 
        scale: Math.max(0.8, scale), 
        y: yOffset, 
        opacity: Math.max(0, opacity),
        transition: { duration: 0.3 }
      });
    }
  }, [isFront, stackIndex, controls, scale, yOffset, opacity]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (!isFront) return;

    if (info.offset.x > 120) {
      controls.start({ x: 600, rotate: 30, opacity: 0 }).then(onSwipeRight);
    } else if (info.offset.x < -120) {
      controls.start({ x: -600, rotate: -30, opacity: 0 }).then(onSwipeLeft);
    } else {
      controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } });
    }
  };

  return (
    <motion.div
      style={{ 
        x, 
        rotate, 
        transformOrigin: 'bottom center', 
        touchAction: 'none',
        zIndex: 10 - stackIndex 
      }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      animate={controls}
      onDragEnd={handleDragEnd}
      className="absolute inset-x-0 top-0 bottom-12 cursor-grab active:cursor-grabbing"
      whileTap={isFront ? { scale: 0.98 } : {}}
    >
      <div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(31,41,55,0.1)] border border-terracotta/5 flex flex-col">
        <div className="relative h-[60%] w-full overflow-hidden">
          <img 
            src={imageUrl} 
            alt={title} 
            className="h-full w-full object-cover select-none pointer-events-none"
          />
          
          {/* Indicators */}
          {isFront && (
            <>
              <motion.div 
                style={{ opacity: likeOpacity }}
                className="absolute top-8 left-8 z-20 flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md"
              >
                <Heart size={16} fill="currentColor" />
                LOVE
              </motion.div>
              
              <motion.div 
                style={{ opacity: passOpacity }}
                className="absolute top-8 right-8 z-20 flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md"
              >
                <X size={16} />
                PASS
              </motion.div>
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
          
          <div className="absolute bottom-6 left-8 right-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/90 drop-shadow-md">
              {category}
            </span>
          </div>
        </div>

        <div className="flex-1 p-8 flex flex-col justify-between">
          <div>
            <h3 className="mb-3 text-2xl font-bold tracking-tight text-charcoal font-heading leading-[1.1]">
              {title}
            </h3>
            <p className="text-sm leading-[1.6] text-charcoal/60 line-clamp-3">
              {description}
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.15em] text-charcoal/30 border-t border-charcoal/5 pt-6">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-charcoal/5">Prep: {prepTime}</span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-charcoal/5">Diff: {difficulty}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

