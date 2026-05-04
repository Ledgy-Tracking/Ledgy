function arithmetic_old(values, operation) {
  if (!values || values.length === 0) {
    return NaN;
  }

  switch (operation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return NaN;
  }
}

function arithmetic_new(values, operation) {
  if (!values || values.length === 0) {
    return NaN;
  }

  switch (operation) {
    case 'sum': {
      let sum = 0;
      for (let i = 0; i < values.length; i++) sum += values[i];
      return sum;
    }
    case 'average': {
      let sum = 0;
      for (let i = 0; i < values.length; i++) sum += values[i];
      return sum / values.length;
    }
    case 'min': {
      let min = Infinity;
      for (let i = 0; i < values.length; i++) {
        if (Number.isNaN(values[i])) return NaN;
        if (values[i] < min) min = values[i];
      }
      return min;
    }
    case 'max': {
      let max = -Infinity;
      for (let i = 0; i < values.length; i++) {
        if (Number.isNaN(values[i])) return NaN;
        if (values[i] > max) max = values[i];
      }
      return max;
    }
    default:
      return NaN;
  }
}

const arr = Array.from({length: 100000}, () => Math.random() * 1000);
console.time('old_sum'); for(let i=0; i<100; i++) arithmetic_old(arr, 'sum'); console.timeEnd('old_sum');
console.time('new_sum'); for(let i=0; i<100; i++) arithmetic_new(arr, 'sum'); console.timeEnd('new_sum');

console.time('old_min'); for(let i=0; i<100; i++) arithmetic_old(arr, 'min'); console.timeEnd('old_min');
console.time('new_min'); for(let i=0; i<100; i++) arithmetic_new(arr, 'min'); console.timeEnd('new_min');
