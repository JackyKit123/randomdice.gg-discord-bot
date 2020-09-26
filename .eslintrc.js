module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
    env: {
        node: true,
    },
    extends: [
        'airbnb',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint',
        'plugin:prettier/recommended',
        'prettier',
    ],
    settings: {
        'import/resolver': {
            alias: {
                map: ['./src'],
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            },
        },
    },
    rules: {
        'prettier/prettier': 'error',
        'import/extensions': 0,
    },
};
