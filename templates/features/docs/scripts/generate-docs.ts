import { mkdir, writeFile } from 'node:fs/promises';
import { __DOCS_BUILD_IMPORTS__ } from '../src/utils/openapi.js';
await mkdir('docs/api', { recursive: true });
__DOCS_EXPORTS__
console.log('Selected API exports generated. Reimport to update Postman.');
