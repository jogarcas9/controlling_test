const path = require('path');
const { whenProd } = require('@craco/craco');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  webpack: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@store': path.resolve(__dirname, 'src/store'),
    },
    configure: (webpackConfig, { env, paths }) => {
      // Optimizaciones solo para producción
      if (env === 'production') {
        // Optimización de JavaScript
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                compress: {
                  drop_console: true, // Elimina console.logs en producción
                  drop_debugger: true,
                },
                output: {
                  comments: false, // Elimina comentarios
                },
              },
              extractComments: false,
            }),
          ],
          splitChunks: {
            chunks: 'all',
            maxInitialRequests: Infinity,
            minSize: 20000,
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name(module) {
                  // Obtiene el nombre del paquete
                  const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                  // Retorna nombre normalizado para evitar problemas con @ y /
                  return `npm.${packageName.replace('@', '')}`;
                },
              },
            },
          },
        };

        // Añadir plugins de compresión
        webpackConfig.plugins.push(
          new CompressionPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240, // Solo comprime archivos mayores a 10KB
            minRatio: 0.8,
          })
        );

        // Análisis de bundle (solo si la variable de entorno está configurada)
        if (process.env.ANALYZE) {
          webpackConfig.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              reportFilename: 'bundle-report.html',
            })
          );
        }
      }

      return webpackConfig;
    },
  },
  // Desactivar generación de sourcemaps en producción
  eslint: {
    enable: false, // Desactivar eslint durante la compilación
  },
}; 