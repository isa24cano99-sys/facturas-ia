const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Cambia la ubicación de la caché de Puppeteer al directorio del proyecto.
  // Esto es necesario para que Render lo encuentre después del build.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
