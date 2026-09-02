export function formatIndianNumber(num: number): string {
  if (num === undefined || num === null) return '0';
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  let res = '';

  if (absNum >= 10000000) {
    res = `${(absNum / 10000000).toFixed(2)} Cr`;
  } else if (absNum >= 100000) {
    res = `${(absNum / 100000).toFixed(2)}L`;
  } else if (absNum >= 1000) {
    res = `${(absNum / 1000).toFixed(2)}k`;
  } else {
    res = absNum.toFixed(2);
  }

  return isNegative ? `-${res}` : `+${res}`;
}
