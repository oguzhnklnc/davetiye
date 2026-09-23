function normalizedName(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ı", "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

export function arePotentialDuplicateNames(left, right) {
  const a = normalizedName(left);
  const b = normalizedName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const aTokens = a.split(" ");
  const bTokens = b.split(" ");
  if (aTokens.length !== bTokens.length || Math.max(a.length, b.length) < 7) return false;
  const sharedToken = aTokens.some((token) => token.length >= 3 && bTokens.includes(token));
  return sharedToken && editDistance(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.12));
}

export function findPotentialDuplicatePairs(records) {
  const pairs = [];
  for (let left = 0; left < records.length; left += 1) {
    for (let right = left + 1; right < records.length; right += 1) {
      if (arePotentialDuplicateNames(records[left].name, records[right].name)) pairs.push([records[left], records[right]]);
    }
  }
  return pairs;
}
