export function buildTableRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index + 1}`,
    name: `Row ${index + 1}`,
    score: index + 1,
    status: index % 2 === 0 ? "Active" : "Inactive",
  }));
}
