module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    "plugin:vue/essential",
    "@vue/standard",
    "@vue/typescript/recommended"
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "semi": ["error", "always"],
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "indent": ["error", 4],
    "space-before-function-paren": ["error", {
        "anonymous": "always",
        "named": "never",
        "asyncArrow": "always"
    }],
    "space-infix-ops": "off",
    "lines-between-class-members": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/interface-name-prefix": ["error", {
        "prefixWithI": "always"
    }],
    // Can't enable this rule since we want to use patterns like myVarName_ImportantNote
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "import/no-named-default": "off",
  },
};
