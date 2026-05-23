sed -i "s/fromPosition: undefined,/fromPosition: 'right' as any,/" src/features/nodeEditor/components/ConnectionLine.test.tsx
sed -i "s/toPosition: undefined,/toPosition: 'left' as any,/" src/features/nodeEditor/components/ConnectionLine.test.tsx
sed -i "s/connectionLineType: undefined,/connectionLineType: 'default' as any,/" src/features/nodeEditor/components/ConnectionLine.test.tsx
