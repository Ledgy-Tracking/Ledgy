import fs from 'fs';

// Fix NodeCanvas.tsx
let nc = fs.readFileSync('src/features/nodeEditor/NodeCanvas.tsx', 'utf-8');
nc = nc.replace(/connectionLineComponent=\{ConnectionLineWithStatus\}/g, "connectionLineComponent={ConnectionLineWithStatus as any}");
fs.writeFileSync('src/features/nodeEditor/NodeCanvas.tsx', nc);
