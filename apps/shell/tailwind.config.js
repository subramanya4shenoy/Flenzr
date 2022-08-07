const { createGlobPatternsForDependencies } = require('@nrwl/react/tailwind');
const { join } = require('path');

module.exports = {
  content: [
    join(
      __dirname,
      '{src,pages,components}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    ...createGlobPatternsForDependencies(__dirname)
  ],
  theme: {
    colors: {
      primary: '#4525F2',
      secondary: '#673BB7',
      error: '#E50202',
      warning: '#FE9431',
      info: '#2754e6',
      success: '#00B24B',
      white: '#ffff',
      black: '#000000',
      darkBlue: '#02021c'
    },
    screens: {
      mobile: '640px',
      laptop: '1024px',
      desktop: '1280px'
    },
    extend: {}
  },
  plugins: []
};
