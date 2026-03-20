import { useState, useEffect } from 'react';
import { customization, ItemCategory } from '../services/customization';

export function useCustomization() {
  const [ownedItems, setOwnedItems] = useState<string[]>(customization.getOwnedItems());
  const [equippedTheme, setEquippedTheme] = useState<string | null>(customization.getEquipped('theme'));
  const [equippedBezel, setEquippedBezel] = useState<string | null>(customization.getEquipped('bezel'));
  const [equippedAvatar, setEquippedAvatar] = useState<string | null>(customization.getEquipped('avatar'));
  const [equippedVoice, setEquippedVoice] = useState<string | null>(customization.getEquipped('voice'));

  useEffect(() => {
    const update = () => {
      setOwnedItems(customization.getOwnedItems());
      setEquippedTheme(customization.getEquipped('theme'));
      setEquippedBezel(customization.getEquipped('bezel'));
      setEquippedAvatar(customization.getEquipped('avatar'));
      setEquippedVoice(customization.getEquipped('voice'));
    };

    const unsubscribe = customization.subscribe(update);
    update(); // Initial sync
    return () => { unsubscribe(); };
  }, []);

  return {
    ownedItems,
    equippedTheme,
    equippedBezel,
    equippedAvatar,
    equippedVoice,
    buyItem: (id: string) => customization.buyItem(id),
    equipItem: (category: ItemCategory, id: string | null) => customization.equipItem(category, id)
  };
}
