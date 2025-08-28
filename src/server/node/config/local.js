import defaultConfig from './default.js';

export default {
  ...defaultConfig,
  // Local development overrides
  allowedTimeDifference: 300000, // 5 minutes for dev
  port: 3008 // Prof service port
};