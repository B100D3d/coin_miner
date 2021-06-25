module.exports = {
    root: true,
    env: {
        node: true,
    },
    plugins: ["@typescript-eslint", "prettier"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "airbnb-base",
        "prettier",
    ],
    parser: "@typescript-eslint/parser",
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
        "no-unused-vars": "off",
        "no-empty": "off",
        "no-prototype-builtins": "off",
        "import/prefer-default-export": "off",
        "no-param-reassign": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "lines-between-class-members": "off",
        "no-nested-ternary": "off",
        "no-return-assign": "off",
        "class-methods-use-this": "off",
        "prefer-destructuring": "off",
        "import/extensions": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-empty-function": "off",
        "no-restricted-syntax": "off",
        "no-await-in-loop": "off",
        "consistent-return": "off",
    },
    settings: {
        "import/resolver": {
            typescript: {},
        },
    },
}