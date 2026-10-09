export default {
  '*.{js,mjs,ts,tsx}': ['prettier --write', 'eslint --max-warnings=0 --no-warn-ignored'],
  '*.{json,md,css,yml,yaml}': ['prettier --write'],
};
