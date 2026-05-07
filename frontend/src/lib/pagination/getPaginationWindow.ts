export function getPaginationWindow({
  page,
  totalPages,
  windowSize,
}: {
  page: number;
  totalPages: number;
  windowSize: number;
}) {
  const start = Math.max(1, page - windowSize);
  const end = Math.min(totalPages, page + windowSize);
  const values: number[] = [];

  for (let index = start; index <= end; index += 1) {
    values.push(index);
  }

  return values;
}
