import { readFileSync, writeFileSync } from 'fs';

const path = 'src/features/nodeEditor/NodeCanvas.tsx';
let content = readFileSync(path, 'utf8');

// The issue is that connectionLineComponent expects a component that takes ConnectionLineComponentProps
// But we pass ConnectionLine which takes ExtendedConnectionLineProps where connectionStatus can be 'valid' | 'invalid' | 'default' | 'snapped'
// which conflicts with the built in 'valid' | 'invalid' | null.
// To fix this, we can cast ConnectionLine to any in the ReactFlow props.

content = content.replace(/connectionLineComponent=\{ConnectionLine\}/g, 'connectionLineComponent={ConnectionLine as any}');

writeFileSync(path, content);
