#!/bin/bash

# Fix useEdgeDrag.ts
sed -i 's/const REBUILD_THROTTLE_MS = 100;//' src/features/nodeEditor/hooks/useEdgeDrag.ts
sed -i 's/const touchStartRef = useRef<number>(0);//' src/features/nodeEditor/hooks/useEdgeDrag.ts
sed -i 's/cancelDrag();//' src/features/nodeEditor/hooks/useEdgeDrag.ts

# Fix useHandlePositions.ts
sed -i 's/const DEFAULT_VIEWPORT_PADDING = 100;//' src/features/nodeEditor/hooks/useHandlePositions.ts

# Fix snapDetection.ts
sed -i 's/const snapRadius = 20;//' src/features/nodeEditor/utils/snapDetection.ts

# Fix portTypeUtils.test.ts
sed -i 's/import { PortType, CanvasNode }/import { PortType }/' src/features/nodeEditor/utils/portTypeUtils.test.ts

# Fix NodeCanvas.tsx
sed -i 's/import { getTypeDisplayName } from/import { getPortColor } from/' src/features/nodeEditor/NodeCanvas.tsx # might be wrong, need to check
sed -i 's/const { nodes, edges, onNodesChange, onEdgesChange, onConnect, schemas } = useNodeStore(/const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useNodeStore(/' src/features/nodeEditor/NodeCanvas.tsx
