export function generateNextCode(existingCodes: string[], prefix: string, padLength = 3): string {
  const prefixEscaped = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`^${prefixEscaped}(\\d+)$`);
  
  let maxNum = 0;
  for (const code of existingCodes) {
    if (!code) continue;
    const match = code.trim().toUpperCase().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  
  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(padLength, '0')}`;
}
