const fs = require('fs');

const filepath = 'src/features/nodeEditor/hooks/useEdgeDrag.ts';
let content = fs.readFileSync(filepath, 'utf8');

// Fix unused variables
content = content.replace('const REBUILD_THROTTLE_MS = 16;', '// const REBUILD_THROTTLE_MS = 16;');
content = content.replace('const touchStartRef = useRef<{ x: number, y: number } | null>(null);', '// const touchStartRef = useRef<{ x: number, y: number } | null>(null);');

// Fix cancelDrag used before initialization
content = content.replace(
    'if (cancelDrag) cancelDrag();\n            \n            const cancelDrag = () => {',
    'let cancelDrag: (() => void) | undefined;\n            if (cancelDrag) cancelDrag();\n            \n            cancelDrag = () => {'
);

fs.writeFileSync(filepath, content, 'utf8');
