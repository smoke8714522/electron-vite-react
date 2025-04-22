import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Base recommended configs
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Configuration for Node.js files (main, preload, configs)
  {
    files: ['electron/**/*.ts', '*.cjs', '*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node, // Add Node.js globals
      },
    },
    rules: {
      // Allow require in CJS/MJS if needed, adjust specific rules for Node
      "@typescript-eslint/no-var-requires": "off", // Example override for Node
    }
  },

  // Configuration for Renderer/React files
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser, // Add Browser globals
        // Add React/JSX specific globals if needed, though parser usually handles it
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Ensure JSX is enabled for .tsx files
        },
      },
    },
    rules: {
      // React/Renderer specific rules will go here
      // For now, let's disable the explicit-any temporarily to reduce noise
      "@typescript-eslint/no-explicit-any": "off",
    }
  },

  // General project-wide rules or overrides
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" },
      ],
    },
  },

  // Files to ignore
  {
    ignores: ["dist/", "dist-*", "node_modules/", ".vscode/"] // Added .vscode
  }
); 