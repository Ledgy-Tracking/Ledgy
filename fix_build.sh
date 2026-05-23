sed -i 's/const onConnectStart = useCallback(({\n        handleId,\n        nodeId,\n    }: {\n        handleId: string | null;\n        nodeId: string;\n    })/const onConnectStart = useCallback((event: MouseEvent | TouchEvent, { handleId, nodeId }: { handleId: string | null; nodeId: string | null })/g' src/features/nodeEditor/NodeCanvas.tsx

# Or we can just use patch or python
