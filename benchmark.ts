const entries = Array.from({ length: 100000 }, (_, i) => ({
    data: {
        field1: Math.random() * 100,
        field2: i % 2 === 0 ? "string" : Math.random() * 100
    }
}));

const fieldIds = ['field1', 'field2'];

console.time('original');
const result1: any = {};
fieldIds.forEach(fieldId => {
    const values = entries
        .map(e => e.data[fieldId])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) {
        result1[fieldId] = null;
    } else {
        result1[fieldId] = {
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            // Math.min(...values) would crash here! So we skip it for benchmark, or slice it
            // min: Math.min(...values.slice(0, 10000)),
            count: values.length,
        };
    }
});
console.timeEnd('original');

console.time('optimized');
const result2: any = {};
fieldIds.forEach(fieldId => {
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let count = 0;

    for (let i = 0; i < entries.length; i++) {
        const v = entries[i].data[fieldId];
        if (typeof v === 'number' && !Number.isNaN(v)) {
            sum += v;
            if (v < min) min = v;
            if (v > max) max = v;
            count++;
        }
    }

    if (count === 0) {
        result2[fieldId] = null;
    } else {
        result2[fieldId] = {
            avg: sum / count,
            min,
            max,
            count,
        };
    }
});
console.timeEnd('optimized');
