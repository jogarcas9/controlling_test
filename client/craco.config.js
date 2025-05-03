const CracoAlias = require('craco-alias');

module.exports = {
  plugins: [
    {
      plugin: CracoAlias,
      options: {
        source: 'tsconfig',
        baseUrl: '.',
        tsConfigPath: './tsconfig.json',
      },
    },
  ],
  eslint: {
    enable: false,
  },
  webpack: {
    configure: (webpackConfig) => {
      // Disable eslint warnings
      const eslintRule = webpackConfig.module.rules.find((rule) => 
        rule.use && rule.use.some((use) => use.options && use.options.eslintPath)
      );
      if (eslintRule) {
        eslintRule.use.forEach((use) => {
          if (use.options && use.options.eslintPath) {
            use.options.quiet = true;
            use.options.emitWarning = false;
          }
        });
      }
      return webpackConfig;
    },
  },
}; 