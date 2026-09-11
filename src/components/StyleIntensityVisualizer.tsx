import React from 'react';
import { StyleIntensity } from '../types';

interface StyleIntensityVisualizerProps {
  intensity: StyleIntensity;
}

const INTENSITY_ITEMS: { key: keyof StyleIntensity; label: string; color: string }[] = [
  { key: 'ambient', label: 'Ambient', color: 'bg-amber-400' },
  { key: 'minimalist', label: 'Minimalist', color: 'bg-orange-400' },
  { key: 'meditative', label: 'Meditative', color: 'bg-yellow-400' },
  { key: 'sleepFriendly', label: 'Sleep-Friendly', color: 'bg-blue-400' },
  { key: 'emotional', label: 'Emotional', color: 'bg-rose-400' },
  { key: 'cinematic', label: 'Cinematic', color: 'bg-purple-400' },
  { key: 'musicalActivity', label: 'Musical Activity', color: 'bg-emerald-400' },
];

export const StyleIntensityVisualizer: React.FC<StyleIntensityVisualizerProps> = ({ intensity }) => {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {INTENSITY_ITEMS.map(({ key, label, color }) => {
          const value = Math.max(0, Math.min(100, intensity[key] || 0));
          return (
            <div
              key={key}
              className="p-2 rounded-lg bg-[#141720] border border-[#232734] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">{label}</span>
                <span className="font-mono text-amber-400 font-bold">{value}%</span>
              </div>
              <div className="w-full h-2 bg-[#1d222e] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
