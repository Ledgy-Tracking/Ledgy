const nodes = Array.from({length: 10000}, (_, i) => ({
    position: { x: Math.random() * 1000, y: Math.random() * 1000 },
    width: Math.random() * 200,
    height: Math.random() * 200
}));

console.time('current');
for(let iter=0; iter<100; iter++) {
    const xs = nodes.map(n => n.position.x);
    const ys = nodes.map(n => n.position.y);
    const widths = nodes.map(n => (n.width || 150));
    const heights = nodes.map(n => (n.height || 100));

    // Spread throws max call stack exceeded for large arrays, but we'll try something smaller if needed
    // Assuming Math.min doesn't throw for 10k... wait, it might in node!
    try {
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs.map((x, i) => x + widths[i]));
        const maxY = Math.max(...ys.map((y, i) => y + heights[i]));
    } catch(e) {
        // Just break out if it throws
    }
}
console.timeEnd('current');

console.time('single pass loop');
for(let iter=0; iter<100; iter++) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const x = node.position.x;
        const y = node.position.y;
        const w = node.width || 150;
        const h = node.height || 100;

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
    }
}
console.timeEnd('single pass loop');
