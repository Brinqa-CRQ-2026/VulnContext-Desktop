import type { SortOrder } from "../../types";

export interface SortState<TSortKey extends string> {
  key: TSortKey;
  order: SortOrder;
}

export function toggleSort<TSortKey extends string>(
  currentSort: SortState<TSortKey>,
  nextKey: TSortKey
): SortState<TSortKey> {
  if (currentSort.key === nextKey) {
    return {
      key: nextKey,
      order: currentSort.order === "asc" ? "desc" : "asc",
    };
  }

  return {
    key: nextKey,
    order: "asc",
  };
}

export function compareSortValues(
  left: string | number | boolean | null,
  right: string | number | boolean | null,
  order: SortOrder
) {
  const direction = order === "asc" ? 1 : -1;

  if (typeof left === "string" || typeof right === "string") {
    const normalizedLeft = String(left ?? "").toLowerCase();
    const normalizedRight = String(right ?? "").toLowerCase();
    return normalizedLeft.localeCompare(normalizedRight) * direction;
  }

  const normalizedLeft =
    typeof left === "boolean" ? Number(left) : (left ?? Number.NEGATIVE_INFINITY);
  const normalizedRight =
    typeof right === "boolean" ? Number(right) : (right ?? Number.NEGATIVE_INFINITY);
  return (normalizedLeft - normalizedRight) * direction;
}
