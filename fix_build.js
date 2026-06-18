import fs from 'fs';

// Fix ConnectionLine.test.tsx
let clTest = fs.readFileSync('src/features/nodeEditor/components/ConnectionLine.test.tsx', 'utf-8');
clTest = clTest.replace(/fromPosition: undefined,/g, "fromPosition: 'right' as any,");
clTest = clTest.replace(/toPosition: undefined,/g, "toPosition: 'left' as any,");
clTest = clTest.replace(/connectionLineType: undefined,/g, "connectionLineType: 'default' as any,");
fs.writeFileSync('src/features/nodeEditor/components/ConnectionLine.test.tsx', clTest);

// Fix ConnectionLine.tsx
let cl = fs.readFileSync('src/features/nodeEditor/components/ConnectionLine.tsx', 'utf-8');
cl = cl.replace(/interface ExtendedConnectionLineProps extends ConnectionLineComponentProps \{/g, "interface ExtendedConnectionLineProps extends Omit<ConnectionLineComponentProps, 'connectionStatus'> {");
fs.writeFileSync('src/features/nodeEditor/components/ConnectionLine.tsx', cl);
