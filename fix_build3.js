import fs from 'fs';

// Fix NodeCanvas.tsx type errors
let nc = fs.readFileSync('src/features/nodeEditor/NodeCanvas.tsx', 'utf-8');
nc = nc.replace(/onConnectStart=\{\(\{ handleId, nodeId \}\) => \{/g, "onConnectStart={(event, { handleId, nodeId }) => {");
fs.writeFileSync('src/features/nodeEditor/NodeCanvas.tsx', nc);
