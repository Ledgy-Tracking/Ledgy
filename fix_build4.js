import fs from 'fs';

// NodeCanvas.tsx still has issues:
let nc = fs.readFileSync('src/features/nodeEditor/NodeCanvas.tsx', 'utf-8');
nc = nc.replace(/connectionLineComponent=\{ConnectionLineWithStatus as any\}/g, "connectionLineComponent={ConnectionLineWithStatus as unknown as any}");
nc = nc.replace(/onConnectStart=\{\(event, \{ handleId, nodeId \}\) => \{/g, "onConnectStart={(event: any, { handleId, nodeId }: any) => {");
fs.writeFileSync('src/features/nodeEditor/NodeCanvas.tsx', nc);
