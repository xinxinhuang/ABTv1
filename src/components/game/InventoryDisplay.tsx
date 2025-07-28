import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PlayerInventory } from '@/types/game';

interface InventoryDisplayProps {
  inventory: PlayerInventory | null;
}

export function InventoryDisplay({ inventory }: InventoryDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        {inventory ? (
          <div className="space-y-2">
            <p>Humanoid Packs: {inventory.humanoid_packs}</p>
            <p>Weapon Packs: {inventory.weapon_packs}</p>
          </div>
        ) : (
          <p>Could not load inventory.</p>
        )}
      </CardContent>
    </Card>
  );
}
