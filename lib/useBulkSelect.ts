"use client";
import { useCallback, useMemo, useState } from "react";

// Small selection helper shared by every admin list that supports bulk actions.
// Tracks a set of picked row ids and exposes the handful of operations the UI
// needs: toggle one, select/clear a whole filtered set, and read the count.
export function useBulkSelect() {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  const has = useCallback((id: string) => ids.has(id), [ids]);
  const toggle = useCallback((id: string) =>
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    }), []);
  const clear = useCallback(() => setIds(new Set()), []);
  // Replace the whole selection (used by "select all filtered").
  const selectOnly = useCallback((list: string[]) => setIds(new Set(list)), []);
  // Add a batch on top of what's already selected (used by "select former").
  const addMany = useCallback((list: string[]) =>
    setIds((prev) => {
      const next = new Set(prev);
      for (const id of list) next.add(id);
      return next;
    }), []);
  const removeMany = useCallback((list: string[]) =>
    setIds((prev) => {
      const next = new Set(prev);
      for (const id of list) next.delete(id);
      return next;
    }), []);

  // Are all of `list` currently selected? (empty list ⇒ false, so the header
  // checkbox reads unchecked when there's nothing to select).
  const allSelected = useCallback(
    (list: string[]) => list.length > 0 && list.every((id) => ids.has(id)),
    [ids],
  );

  const list = useMemo(() => [...ids], [ids]);

  return { ids, list, size: ids.size, has, toggle, clear, selectOnly, addMany, removeMany, allSelected };
}
