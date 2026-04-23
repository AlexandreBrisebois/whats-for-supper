'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Lock, ChevronRight, Plus } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { Button } from '@/components/ui/button';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface PreSelectedRecipe {
  recipeId: string;
  name: string;
  heroImageUrl: string;
  voteCount: number;
  familySize: number;
  unanimousVote: boolean;
  dayIndex: number;
  isLocked: boolean;
}

interface OpenSlot {
  dayIndex: number;
}

interface SmartDefaultsDto {
  weekOffset: number;
  familySize: number;
  consensusThreshold: number;
  preSelectedRecipes: PreSelectedRecipe[];
  openSlots: OpenSlot[];
  consensusRecipesCount: number;
}

interface SmartDefaultsProps {
  weekOffset?: number;
  onSlotClick?: (dayIndex: number) => void;
  onRefresh?: () => void;
}

export function SmartDefaults({ weekOffset = 0, onSlotClick, onRefresh }: SmartDefaultsProps) {
  const [data, setData] = useState<SmartDefaultsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prevData, setPrevData] = useState<SmartDefaultsDto | null>(null);

  // Map recipes to day slots (7 items, some may be null for open slots)
  const daySlots: (PreSelectedRecipe | null)[] = Array.from({ length: 7 }, (_, i) => {
    const recipe = data?.preSelectedRecipes.find((r) => r.dayIndex === i);
    return recipe || null;
  });

  useEffect(() => {
    const fetchSmartDefaults = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/backend/schedule/${weekOffset}/smart-defaults`);
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorData || response.statusText}`);
        }
        const result = await response.json();
        setPrevData(data);
        setData(result.data || result);
      } catch (error) {
        console.error('Failed to fetch smart defaults:', error);
        // Provide mock data for UI development
        setData({
          weekOffset,
          familySize: 4,
          consensusThreshold: 3,
          preSelectedRecipes: [
            {
              recipeId: 'pasta-1',
              name: 'Pasta Carbonara',
              heroImageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221fcf2d',
              voteCount: 4,
              familySize: 4,
              unanimousVote: true,
              dayIndex: 0,
              isLocked: true,
            },
            {
              recipeId: 'tacos-1',
              name: 'Fish Tacos',
              heroImageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
              voteCount: 3,
              familySize: 4,
              unanimousVote: false,
              dayIndex: 1,
              isLocked: false,
            },
            {
              recipeId: 'curry-1',
              name: 'Butter Chicken Curry',
              heroImageUrl: 'https://images.unsplash.com/photo-1565557623814-695d67c3f264',
              voteCount: 3,
              familySize: 4,
              unanimousVote: false,
              dayIndex: 2,
              isLocked: false,
            },
          ],
          openSlots: [{ dayIndex: 3 }, { dayIndex: 4 }, { dayIndex: 5 }, { dayIndex: 6 }],
          consensusRecipesCount: 3,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSmartDefaults();
  }, [weekOffset]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/backend/schedule/${weekOffset}/smart-defaults`);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData || response.statusText}`);
      }
      const result = await response.json();
      setPrevData(data);
      setData(result.data || result);
    } catch (error) {
      console.error('Failed to refresh smart defaults:', error);
    } finally {
      setIsRefreshing(false);
    }
    onRefresh?.();
  };

  const getVoteBadgeText = (recipe: PreSelectedRecipe) => {
    if (recipe.unanimousVote) {
      return `${recipe.voteCount}/${recipe.voteCount} voted`;
    }
    return `${recipe.voteCount}/${recipe.familySize} voted`;
  };

  const getHighlightColor = (recipe: PreSelectedRecipe) => {
    if (recipe.unanimousVote) {
      return 'sage'; // Sage green for unanimous
    }
    return 'ochre'; // Ochre for consensus
  };

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-heading font-bold text-charcoal mb-1">Smart Defaults</h3>
          <p className="text-xs text-charcoal/40 font-medium">
            {data ? `${data.consensusRecipesCount} recipes hit consensus` : 'Loading...'}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            'p-3 rounded-full transition-all active:scale-90',
            isRefreshing
              ? 'bg-ochre/20 text-ochre'
              : 'bg-charcoal/5 text-charcoal/40 hover:bg-charcoal/10'
          )}
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </motion.button>
      </div>

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <SolarLoader size="sm" label="Curating smart picks..." />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Grid */}
      {!isLoading && data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {daySlots.map((recipe, dayIndex) => (
            <motion.div
              key={dayIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIndex * 0.05 }}
              layout
            >
              {recipe ? (
                // Recipe Card
                <RecipeCard
                  recipe={recipe}
                  dayIndex={dayIndex}
                  highlight={getHighlightColor(recipe)}
                  voteText={getVoteBadgeText(recipe)}
                />
              ) : (
                // Open Slot Card
                <OpenSlotCard dayIndex={dayIndex} onClick={() => onSlotClick?.(dayIndex)} />
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Threshold Info */}
      {!isLoading && data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 bg-sage/5 rounded-2xl border border-sage/10"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-sage/10 rounded-lg mt-0.5">
              <Lock size={14} className="text-sage" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-sage/80 uppercase tracking-wider mb-1">
                Consensus Locked
              </p>
              <p className="text-xs text-charcoal/60 leading-relaxed">
                {data.familySize === 2
                  ? 'Both family members must vote to reach consensus.'
                  : `${data.consensusThreshold} of ${data.familySize} family members must vote. You need ${Math.ceil((data.familySize + 1) / 2)} votes to lock a recipe.`}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Recipe Card Component
 * Displays a pre-selected recipe with hero image, name, and vote badge
 */
interface RecipeCardProps {
  recipe: PreSelectedRecipe;
  dayIndex: number;
  highlight: 'sage' | 'ochre';
  voteText: string;
}

function RecipeCard({ recipe, dayIndex, highlight, voteText }: RecipeCardProps) {
  const highlightColor =
    highlight === 'sage' ? 'border-sage/30 bg-sage/5' : 'border-ochre/30 bg-ochre/5';

  const badgeColor = highlight === 'sage' ? 'bg-sage text-white' : 'bg-ochre text-white';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'rounded-2xl overflow-hidden glass border-2 transition-all duration-300',
        highlightColor,
        'cursor-pointer group'
      )}
    >
      <div className="flex items-center p-4">
        {/* Day Column */}
        <div className="flex flex-col items-center justify-center w-12 mr-4 flex-shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-wider text-charcoal/40 mb-1">
            {DAYS[dayIndex]}
          </span>
          <span className="text-base font-heading font-extrabold text-charcoal">
            {String(dayIndex + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Image & Content */}
        <div className="flex-1 min-w-0 flex items-center">
          <div className="relative h-16 w-16 rounded-xl overflow-hidden mr-3 flex-shrink-0 bg-charcoal/5 border border-white/30 shadow-sm">
            <Image src={recipe.heroImageUrl} alt={recipe.name} fill className="object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-charcoal truncate mb-1">{recipe.name}</h4>
            <div className="flex items-center space-x-2">
              <span
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md text-white shadow-sm',
                  badgeColor
                )}
              >
                {voteText}
              </span>
              {recipe.unanimousVote && (
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-white/40 text-charcoal rounded-md">
                  ✓ Locked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chevron Indicator */}
        <motion.div
          initial={{ x: 0 }}
          whileHover={{ x: 4 }}
          className="ml-2 text-charcoal/20 flex-shrink-0"
        >
          <ChevronRight size={18} />
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Open Slot Card Component
 * Displays an empty day slot ready for manual selection
 */
interface OpenSlotCardProps {
  dayIndex: number;
  onClick?: () => void;
}

function OpenSlotCard({ dayIndex, onClick }: OpenSlotCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden glass border-2 border-dashed border-terracotta/30 hover:border-terracotta/50 hover:bg-terracotta/3 transition-all duration-300 group"
    >
      <div className="flex items-center p-4">
        {/* Day Column */}
        <div className="flex flex-col items-center justify-center w-12 mr-4 flex-shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-wider text-charcoal/40 mb-1">
            {DAYS[dayIndex]}
          </span>
          <span className="text-base font-heading font-extrabold text-charcoal/60">
            {String(dayIndex + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Empty State */}
        <div className="flex-1 min-w-0 flex items-center">
          <motion.div
            animate={{
              borderColor: [
                'rgba(205, 93, 69, 0.2)',
                'rgba(205, 93, 69, 0.4)',
                'rgba(205, 93, 69, 0.2)',
              ],
              backgroundColor: [
                'rgba(205, 93, 69, 0.04)',
                'rgba(205, 93, 69, 0.08)',
                'rgba(205, 93, 69, 0.04)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-12 w-12 rounded-xl border-2 border-dashed flex items-center justify-center mr-3 flex-shrink-0"
          >
            <Plus className="text-terracotta" size={20} />
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-terracotta/70 leading-tight">Open slot</p>
            <p className="text-[10px] text-charcoal/40 font-medium">Vote to fill</p>
          </div>
        </div>

        {/* Chevron Indicator */}
        <motion.div
          initial={{ x: 0 }}
          whileHover={{ x: 4 }}
          className="ml-2 text-terracotta/40 flex-shrink-0 group-hover:text-terracotta/60 transition-colors"
        >
          <ChevronRight size={18} />
        </motion.div>
      </div>
    </motion.button>
  );
}
