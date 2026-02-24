"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type FavoriteItem = {
  id: number;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  room?: string;
  style?: string;
  description?: string;
  storeName?: string;
  storeSlug?: string;
};

const STORAGE_KEY = "mueblesar:favorites:v1";

export function useFavorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (err) {
      console.warn("No se pudo leer favoritos", err);
    }
  }, []);

  const persist = useCallback((next: FavoriteItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn("No se pudo guardar favoritos", err);
    }
  }, []);

  const isFavorite = useCallback(
    (slug: string) => items.some((item) => item.slug === slug),
    [items]
  );

  const addFavorite = useCallback(
    (item: FavoriteItem) => {
      persist([...items.filter((i) => i.slug !== item.slug), item]);
    },
    [items, persist]
  );

  const removeFavorite = useCallback(
    (slug: string) => {
      persist(items.filter((i) => i.slug !== slug));
    },
    [items, persist]
  );

  const toggleFavorite = useCallback(
    (item: FavoriteItem) => {
      if (isFavorite(item.slug)) {
        removeFavorite(item.slug);
      } else {
        addFavorite(item);
      }
    },
    [addFavorite, removeFavorite, isFavorite]
  );

  return useMemo(
    () => ({ items, addFavorite, removeFavorite, toggleFavorite, isFavorite }),
    [items, addFavorite, removeFavorite, toggleFavorite, isFavorite]
  );
}
