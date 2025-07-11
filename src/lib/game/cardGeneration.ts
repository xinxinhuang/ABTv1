import { CardAttributes } from '@/types/game';

// --- Base Card Data ---
const HUMANOID_CARDS = {
  'Space Marine': { primary: 'str' },
  'Galactic Ranger': { primary: 'dex' },
  'Void Sorcerer': { primary: 'int' },
};

const WEAPON_CARDS = {
  'Plasma Rifle': { primary: 'dex' },
  'Power Fist': { primary: 'str' },
  'Psi-Blade': { primary: 'int' },
};

// --- Helper Functions ---

/**
 * Rolls a random attribute value based on a base value and a bonus percentage.
 * The roll will be between the base value and the max value (base + bonus).
 */
function rollAttribute(base: number, bonusPercentage: number): number {
  const bonus = base * (bonusPercentage / 100);
  const maxValue = base + bonus;
  // Random value between base and maxValue
  const roll = Math.floor(Math.random() * (maxValue - base + 1) + base);
  return Math.round(roll);
}

/**
 * Determines the rarity of a card based on its primary attribute score.
 */
function determineRarity(primaryAttributeValue: number): 'bronze' | 'silver' | 'gold' {
  if (primaryAttributeValue >= 35) return 'gold';
  if (primaryAttributeValue >= 28) return 'silver';
  return 'bronze';
}

// --- Card Generation Functions ---

export function generateHumanoidCard(bonusPercentage: number) {
  const cardNames = Object.keys(HUMANOID_CARDS);
  const selectedCardName = cardNames[Math.floor(Math.random() * cardNames.length)] as keyof typeof HUMANOID_CARDS;
  const cardConfig = HUMANOID_CARDS[selectedCardName];

  const attributes: CardAttributes = {
    str: 20,
    dex: 20,
    int: 20,
  };

  // Apply bonus to the primary attribute
  attributes[cardConfig.primary] = rollAttribute(20, bonusPercentage);

  return {
    card_type: 'humanoid' as const,
    card_name: selectedCardName,
    attributes,
    rarity: determineRarity(attributes[cardConfig.primary]!),
  };
}

export function generateWeaponCard(bonusPercentage: number) {
  const cardNames = Object.keys(WEAPON_CARDS);
  const selectedCardName = cardNames[Math.floor(Math.random() * cardNames.length)] as keyof typeof WEAPON_CARDS;
  const cardConfig = WEAPON_CARDS[selectedCardName];

  const attributes: CardAttributes = {
    str: 10,
    dex: 10,
    int: 10,
  };

  // Apply bonus to the primary attribute
  attributes[cardConfig.primary] = rollAttribute(10, bonusPercentage);

  return {
    card_type: 'weapon' as const,
    card_name: selectedCardName,
    attributes,
    rarity: determineRarity(attributes[cardConfig.primary]!),
  };
}

/**
 * Main function to generate a card based on pack type and bonus.
 */
export function generateCard(packType: 'humanoid' | 'weapon', bonusPercentage: number) {
  if (packType === 'humanoid') {
    return generateHumanoidCard(bonusPercentage);
  }
  return generateWeaponCard(bonusPercentage);
}
