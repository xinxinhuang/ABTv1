import { Card } from '@/types/game';
import { supabase } from '../supabase/client';

/**
 * Determines the winner of a battle between two cards
 */
export const determineBattleWinner = (card1: Card, card2: Card): {
  winner: 'challenger' | 'opponent' | 'draw';
  message: string;
} => {
  // Type advantage system: Void Sorcerer > Space Marine > Galactic Ranger > Void Sorcerer
  if (card1.card_name === 'Void Sorcerer' && card2.card_name === 'Space Marine') {
    return { winner: 'challenger', message: 'Void Sorcerer\'s mystical powers overwhelm Space Marine!' };
  } else if (card1.card_name === 'Space Marine' && card2.card_name === 'Galactic Ranger') {
    return { winner: 'challenger', message: 'Space Marine\'s brute strength overcomes Galactic Ranger!' };
  } else if (card1.card_name === 'Galactic Ranger' && card2.card_name === 'Void Sorcerer') {
    return { winner: 'challenger', message: 'Galactic Ranger\'s speed outwits Void Sorcerer!' };
  } else if (card2.card_name === 'Void Sorcerer' && card1.card_name === 'Space Marine') {
    return { winner: 'opponent', message: 'Void Sorcerer\'s mystical powers overwhelm Space Marine!' };
  } else if (card2.card_name === 'Space Marine' && card1.card_name === 'Galactic Ranger') {
    return { winner: 'opponent', message: 'Space Marine\'s brute strength overcomes Galactic Ranger!' };
  } else if (card2.card_name === 'Galactic Ranger' && card1.card_name === 'Void Sorcerer') {
    return { winner: 'opponent', message: 'Galactic Ranger\'s speed outwits Void Sorcerer!' };
  }
  
  // Same card type, compare primary attributes
  if (card1.card_name === card2.card_name) {
    // Determine primary attribute based on card type
    let primaryAttr = '';
    let attrName = '';
    
    if (card1.card_name === 'Space Marine') {
      primaryAttr = 'str';
      attrName = 'Strength';
    } else if (card1.card_name === 'Galactic Ranger') {
      primaryAttr = 'dex';
      attrName = 'Dexterity';
    } else if (card1.card_name === 'Void Sorcerer') {
      primaryAttr = 'int';
      attrName = 'Intelligence';
    }
    
    const card1Value = card1.attributes[primaryAttr] || 0;
    const card2Value = card2.attributes[primaryAttr] || 0;
    
    if (card1Value > card2Value) {
      return { 
        winner: 'challenger', 
        message: `Both cards are ${card1.card_name}, but challenger's card has higher ${attrName} (${card1Value} vs ${card2Value})!` 
      };
    } else if (card2Value > card1Value) {
      return { 
        winner: 'opponent', 
        message: `Both cards are ${card1.card_name}, but opponent's card has higher ${attrName} (${card2Value} vs ${card1Value})!` 
      };
    } else {
      return { 
        winner: 'draw', 
        message: `Both cards are ${card1.card_name} with equal ${attrName} (${card1Value})! It's a draw!` 
      };
    }
  }
  
  // This should never happen, but just in case
  return { winner: 'draw', message: 'Battle resulted in a draw!' };
};

/**
 * Resolves a battle when both cards have been selected
 */
export const resolveBattle = async (battleId: string): Promise<boolean> => {
  try {
    // Get battle instance
    const { data: battleData, error: battleError } = await supabase
      .from('battle_instances')
      .select('*')
      .eq('id', battleId)
      .single();
      
    if (battleError || !battleData) {
      console.error('Error fetching battle:', battleError);
      return false;
    }
    
    // Get battle cards
    const { data: cardsData, error: cardsError } = await supabase
      .from('battle_cards')
      .select('*, player_cards:card_id(*)')
      .eq('battle_id', battleId);
      
    if (cardsError || !cardsData || cardsData.length !== 2) {
      console.error('Error fetching battle cards:', cardsError);
      return false;
    }
    
    // Identify challenger and opponent cards
    const challengerCard = cardsData.find(card => card.player_id === battleData.challenger_id);
    const opponentCard = cardsData.find(card => card.player_id === battleData.opponent_id);
    
    if (!challengerCard || !opponentCard) {
      console.error('Missing cards for battle resolution');
      return false;
    }
    
    // Determine winner
    const result = determineBattleWinner(
      challengerCard.player_cards as unknown as Card, 
      opponentCard.player_cards as unknown as Card
    );
    
    // Determine winner and loser IDs
    let winnerId, loserId, transferredCardId;
    if (result.winner === 'challenger') {
      winnerId = battleData.challenger_id;
      loserId = battleData.opponent_id;
      transferredCardId = opponentCard.card_id;
    } else if (result.winner === 'opponent') {
      winnerId = battleData.opponent_id;
      loserId = battleData.challenger_id;
      transferredCardId = challengerCard.card_id;
    } else {
      // In case of draw, no card transfer happens
      // Update battle status to completed
      await supabase
        .from('battle_instances')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', battleId);
        
      // Create notifications for both players
      await createBattleNotifications(
        battleId,
        battleData.challenger_id,
        battleData.opponent_id as string,
        'draw',
        result.message
      );
        
      return true;
    }
    
    // Generate a bonus card for the winner
    const { data: bonusCard, error: bonusError } = await generateBonusCard(winnerId);
    
    if (bonusError || !bonusCard) {
      console.error('Error generating bonus card:', bonusError);
      return false;
    }
    
    // Begin a transaction for card transfer and battle completion
    const { error: transferError } = await supabase.rpc('transfer_card_and_complete_battle', {
      p_battle_id: battleId,
      p_winner_id: winnerId,
      p_loser_id: loserId,
      p_transferred_card_id: transferredCardId,
      p_bonus_card_id: bonusCard.id,
      p_explanation: result.message
    });
    
    if (transferError) {
      console.error('Error completing battle transaction:', transferError);
      return false;
    }
    
    // Create notifications for both players
    await createBattleNotifications(
      battleId,
      winnerId,
      loserId,
      'completed',
      result.message
    );
    
    return true;
  } catch (error) {
    console.error('Error resolving battle:', error);
    return false;
  }
};

/**
 * Generates a bonus card for the winner
 */
const generateBonusCard = async (playerId: string) => {
  // Generate a random humanoid card as a bonus
  const cardTypes = ['Space Marine', 'Galactic Ranger', 'Void Sorcerer'];
  const randomCardType = cardTypes[Math.floor(Math.random() * cardTypes.length)];
  
  // Generate random attributes (slightly better than average)
  const generateAttribute = () => Math.floor(Math.random() * 10) + 25; // 25-34 range
  
  const attributes = {
    str: generateAttribute(),
    dex: generateAttribute(),
    int: generateAttribute()
  };
  
  // Determine rarity based on highest attribute
  const highestAttr = Math.max(attributes.str, attributes.dex, attributes.int);
  let rarity = 'bronze';
  if (highestAttr >= 35) {
    rarity = 'gold';
  } else if (highestAttr >= 28) {
    rarity = 'silver';
  }
  
  // Create the bonus card
  return await supabase
    .from('player_cards')
    .insert({
      player_id: playerId,
      card_type: 'humanoid',
      card_name: randomCardType,
      attributes,
      rarity: rarity as 'bronze' | 'silver' | 'gold'
    })
    .select()
    .single();
};

/**
 * Creates battle notifications for both players
 */
const createBattleNotifications = async (
  battleId: string,
  challengerId: string,
  opponentId: string,
  result: 'completed' | 'draw',
  explanation: string
) => {
  // Create notification for challenger
  let challengerMessage = '';
  let opponentMessage = '';
  
  if (result === 'draw') {
    challengerMessage = `Your battle ended in a draw. ${explanation}`;
    opponentMessage = `Your battle ended in a draw. ${explanation}`;
  } else {
    // Check if challenger is winner
    const { data: battle } = await supabase
      .from('battle_instances')
      .select('winner_id')
      .eq('id', battleId)
      .single();
      
    if (battle?.winner_id === challengerId) {
      challengerMessage = `You won the battle! ${explanation} You claimed your opponent's card and received a bonus card!`;
      opponentMessage = `You lost the battle. ${explanation} Your card was claimed by the winner.`;
    } else {
      challengerMessage = `You lost the battle. ${explanation} Your card was claimed by the winner.`;
      opponentMessage = `You won the battle! ${explanation} You claimed your opponent's card and received a bonus card!`;
    }
  }
  
  // Insert notifications
  await supabase.from('battle_notifications').insert([
    {
      battle_id: battleId,
      user_id: challengerId,
      message: challengerMessage,
      is_read: false
    },
    {
      battle_id: battleId,
      user_id: opponentId,
      message: opponentMessage,
      is_read: false
    }
  ]);
};
