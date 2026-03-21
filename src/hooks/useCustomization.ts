import { useState, useEffect } from 'react';
import { customization, ItemCategory } from '../services/customization';

export function useCustomization() {
  const [ownedItems, setOwnedItems] = useState<string[]>(customization.getOwnedItems());
  const [isRetroPassActive, setIsRetroPassActive] = useState<boolean>(customization.isRetroPassActive());
  const [equipped, setEquipped] = useState<Record<ItemCategory, string | null>>({
    feature: customization.getEquipped('feature'),
    performance: customization.getEquipped('performance'),
    pack: customization.getEquipped('pack'),
    console: customization.getEquipped('console')
  });

  useEffect(() => {
    const update = () => {
      setOwnedItems(customization.getOwnedItems());
      setIsRetroPassActive(customization.isRetroPassActive());
      setEquipped({
        feature: customization.getEquipped('feature'),
        performance: customization.getEquipped('performance'),
        pack: customization.getEquipped('pack'),
        console: customization.getEquipped('console')
      });
    };

    const unsubscribe = customization.subscribe(update);
    update(); // Initial sync
    return () => { unsubscribe(); };
  }, []);

  return {
    ownedItems,
    isRetroPassActive,
    equipped,
    buyItem: (id: string) => customization.buyItem(id),
    equipItem: (category: ItemCategory, id: string | null) => customization.equipItem(category, id)
  };
}
