import fs from 'fs';

// NodeCanvas.tsx remaining errors
// "getTypeDisplayName is declared but its value is never read"
let nc = fs.readFileSync('src/features/nodeEditor/NodeCanvas.tsx', 'utf-8');
nc = nc.replace(/import \{ getTypeDisplayName \} from '\.\/utils\/portTypeUtils';/g, "");
nc = nc.replace(/const unsubscribeNode = useNodeStore\.subscribe\(/g, "// const unsubscribeNode = useNodeStore.subscribe(");
nc = nc.replace(/const schemas = useLedgerStore\(\(state\) => state\.schemas\);/g, "// const schemas = useLedgerStore((state) => state.schemas);");
fs.writeFileSync('src/features/nodeEditor/NodeCanvas.tsx', nc);
