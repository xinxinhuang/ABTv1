'use client';

import React from 'react';
import { X } from 'lucide-react';

interface CardTriangleDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CardTriangleDialog: React.FC<CardTriangleDialogProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-yellow-400">Card Type Advantages</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Triangle Diagram */}
        <div className="mb-8">
          <div className="relative mx-auto w-80 h-80">
            {/* Triangle Background */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 320 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Triangle outline */}
              <path
                d="M160 40 L280 240 L40 240 Z"
                stroke="#374151"
                strokeWidth="2"
                fill="rgba(31, 41, 55, 0.3)"
              />
              
              {/* Arrows showing advantages */}
              {/* Void Sorcerer -> Space Marine */}
              <path
                d="M160 60 L100 180"
                stroke="#8B5CF6"
                strokeWidth="3"
                markerEnd="url(#arrowhead-purple)"
              />
              
              {/* Space Marine -> Galactic Ranger */}
              <path
                d="M100 200 L220 200"
                stroke="#EF4444"
                strokeWidth="3"
                markerEnd="url(#arrowhead-red)"
              />
              
              {/* Galactic Ranger -> Void Sorcerer */}
              <path
                d="M240 180 L180 60"
                stroke="#10B981"
                strokeWidth="3"
                markerEnd="url(#arrowhead-green)"
              />

              {/* Arrow markers */}
              <defs>
                <marker
                  id="arrowhead-purple"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#8B5CF6"
                  />
                </marker>
                <marker
                  id="arrowhead-red"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#EF4444"
                  />
                </marker>
                <marker
                  id="arrowhead-green"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#10B981"
                  />
                </marker>
              </defs>
            </svg>

            {/* Card Type Icons/Labels */}
            {/* Void Sorcerer (Top) */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center">
              <div className="bg-purple-900/50 border border-purple-500 rounded-lg p-3 mb-2">
                <div className="text-2xl mb-1">🧙‍♂️</div>
                <div className="text-sm font-bold text-purple-400">Void Sorcerer</div>
                <div className="text-xs text-gray-400">INT focused</div>
              </div>
            </div>

            {/* Space Marine (Bottom Left) */}
            <div className="absolute bottom-4 left-4 text-center">
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-2">
                <div className="text-2xl mb-1">🛡️</div>
                <div className="text-sm font-bold text-red-400">Space Marine</div>
                <div className="text-xs text-gray-400">STR focused</div>
              </div>
            </div>

            {/* Galactic Ranger (Bottom Right) */}
            <div className="absolute bottom-4 right-4 text-center">
              <div className="bg-green-900/50 border border-green-500 rounded-lg p-3 mb-2">
                <div className="text-2xl mb-1">🏹</div>
                <div className="text-sm font-bold text-green-400">Galactic Ranger</div>
                <div className="text-xs text-gray-400">DEX focused</div>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works:</h3>
          
          <div className="grid gap-4">
            <div className="flex items-center gap-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <div className="text-2xl">🧙‍♂️</div>
              <div>
                <div className="font-semibold text-purple-400">Void Sorcerer beats Space Marine</div>
                <div className="text-sm text-gray-400">Magic overcomes brute force</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="text-2xl">🛡️</div>
              <div>
                <div className="font-semibold text-red-400">Space Marine beats Galactic Ranger</div>
                <div className="text-sm text-gray-400">Heavy armor resists ranged attacks</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="text-2xl">🏹</div>
              <div>
                <div className="font-semibold text-green-400">Galactic Ranger beats Void Sorcerer</div>
                <div className="text-sm text-gray-400">Speed and precision interrupt spellcasting</div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
            <h4 className="font-semibold text-yellow-400 mb-2">Same Type Battles:</h4>
            <p className="text-sm text-gray-300">
              When both players choose the same card type, the winner is determined by comparing their primary attribute:
            </p>
            <ul className="text-sm text-gray-400 mt-2 space-y-1">
              <li>• <span className="text-red-400">Space Marines</span> compare STR (Strength)</li>
              <li>• <span className="text-green-400">Galactic Rangers</span> compare DEX (Dexterity)</li>
              <li>• <span className="text-purple-400">Void Sorcerers</span> compare INT (Intelligence)</li>
            </ul>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};