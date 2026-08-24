import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ChevronLeft, ChevronRight, Lock, Building2, Zap, Globe } from 'lucide-react';

export interface BankingSlide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  badge: string;
}

const BANKING_SLIDES: BankingSlide[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80',
    title: 'Intelligent Mobile & Corporate Banking',
    subtitle: 'Real-time liquidity, instant ACH/Wires, and multi-currency Virtual Cards.',
    badge: 'Enterprise Security'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&auto=format&fit=crop&q=80',
    title: 'Instant International Capital Settlement',
    subtitle: 'Send funds across 150+ countries with sub-second execution and zero hidden fees.',
    badge: 'Global Treasury'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1556742049-0a67d51152a5?w=1200&auto=format&fit=crop&q=80',
    title: '256-Bit Encrypted Institutional Protection',
    subtitle: 'Biometric 2FA, immutable audit logs, and full FDIC insured coverage.',
    badge: 'FDIC Insured'
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=1200&auto=format&fit=crop&q=80',
    title: 'Virtual Corporate Credit Lines & Bill Pay',
    subtitle: 'Issue instant sub-account virtual cards with custom spend limits & authorization controls.',
    badge: 'Smart Spend'
  }
];

interface BankingMediaCarouselProps {
  showVideo?: boolean;
  className?: string;
  autoPlayInterval?: number;
}

export const BankingMediaCarousel: React.FC<BankingMediaCarouselProps> = ({
  showVideo = true,
  className = '',
  autoPlayInterval = 4500
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANKING_SLIDES.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlayInterval]);

  const slide = BANKING_SLIDES[currentIndex];

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl ${className}`}>
      {/* Background Video (Muted, Auto-Play, Continuous Loop, Optimized) */}
      {showVideo && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={slide.image}
            className="w-full h-full object-cover opacity-25 scale-105 filter saturate-120"
          >
            <source
              src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-and-graphs-41551-large.mp4"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />
        </div>
      )}

      {/* Image Carousel with Motion Transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
        </motion.div>
      </AnimatePresence>

      {/* Foreground Content Overlay */}
      <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col justify-between">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-400 text-xs font-bold shadow-lg backdrop-blur-md">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Silicon Valley Bank</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{slide.badge}</span>
          </div>
        </div>

        {/* Center/Bottom Slide Title & Subtitle */}
        <div className="space-y-2 max-w-lg my-auto pt-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="space-y-2"
            >
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                {slide.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {slide.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators & Manual Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
          {/* Slide Dots */}
          <div className="flex items-center gap-1.5">
            {BANKING_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-6 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                    : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + BANKING_SLIDES.length) % BANKING_SLIDES.length)}
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % BANKING_SLIDES.length)}
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
