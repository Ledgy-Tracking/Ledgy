import fs from 'fs';
let text = fs.readFileSync('src/features/nodeEditor/utils/groupNodes.ts', 'utf-8');
text = text.replace(/import \{ nanoid \} from 'nanoid';/g, "import { v4 as uuidv4 } from 'uuid';");
text = text.replace(/nanoid\(6\)/g, "uuidv4().substring(0, 6)");
fs.writeFileSync('src/features/nodeEditor/utils/groupNodes.ts', text);
