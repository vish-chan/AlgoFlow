import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        /*
         * Only `src/test/`. `src/integration/suite/*.test.ts` is also a `.test.ts`, but it
         * imports `vscode`, which only exists inside an extension host — vitest would pick
         * it up by default and fail to resolve the module. It runs under
         * `npm run test:integration` instead.
         */
        include: ['src/test/**/*.test.ts'],
    },
});
