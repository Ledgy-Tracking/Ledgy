function pearsonCorrelation_old(x, y) {
  if (!x || !y || x.length === 0 || y.length === 0) {
    return NaN;
  }

  const n = Math.min(x.length, y.length);
  if (n < 2) {
    return NaN;
  }

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((a, b) => a + b, 0);
  const sumY = ySlice.reduce((a, b) => a + b, 0);
  const sumXY = xSlice.reduce((sum, xi, i) => sum + xi * ySlice[i], 0);
  const sumX2 = xSlice.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = ySlice.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) {
    return NaN; // Constant values
  }

  return numerator / denominator;
}

function pearsonCorrelation_new(x, y) {
  if (!x || !y || x.length === 0 || y.length === 0) {
    return NaN;
  }

  const n = Math.min(x.length, y.length);
  if (n < 2) {
    return NaN;
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2 += xi * xi;
    sumY2 += yi * yi;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) {
    return NaN; // Constant values
  }

  return numerator / denominator;
}

const x = Array.from({length: 100000}, () => Math.random() * 100);
const y = Array.from({length: 100000}, () => Math.random() * 100);

console.time('old_corr'); for(let i=0; i<100; i++) pearsonCorrelation_old(x, y); console.timeEnd('old_corr');
console.time('new_corr'); for(let i=0; i<100; i++) pearsonCorrelation_new(x, y); console.timeEnd('new_corr');

console.log(pearsonCorrelation_old([1, 2, 3], [4, 5, 6]), pearsonCorrelation_new([1, 2, 3], [4, 5, 6]));
