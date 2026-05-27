const nodes = Array.from({length: 10000}, (_, i) => ({ id: `node_${i}`, parentId: i % 10 === 0 ? 'container_1' : undefined }));

console.time('filter.map');
for(let i=0; i<100; i++) {
    const ids = nodes.filter(n => n.parentId === 'container_1').map(n => n.id);
    const set = new Set(ids);
}
console.timeEnd('filter.map');

console.time('reduce');
for(let i=0; i<100; i++) {
    const ids = nodes.reduce((acc, n) => {
        if (n.parentId === 'container_1') acc.push(n.id);
        return acc;
    }, []);
    const set = new Set(ids);
}
console.timeEnd('reduce');

console.time('for loop');
for(let i=0; i<100; i++) {
    const set = new Set();
    for (let j = 0; j < nodes.length; j++) {
        if (nodes[j].parentId === 'container_1') {
            set.add(nodes[j].id);
        }
    }
}
console.timeEnd('for loop');
