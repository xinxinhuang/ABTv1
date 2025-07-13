-- Add explanation column to battle_lobbies table
ALTER TABLE battle_lobbies
ADD COLUMN explanation TEXT;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN battle_lobbies.explanation IS 'Explanation of the battle outcome and winner determination logic';
