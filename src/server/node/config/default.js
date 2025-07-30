export default {
  allowedTimeDifference: 60000, // 60 seconds
  maxImageSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  imageResolution: {
    maxWidth: 1024,
    maxHeight: 1024
  },
  profileLimits: {
    maxNameLength: 100,
    maxEmailLength: 255,
    maxFieldLength: 1000,
    maxFields: 20
  },
  dataPath: './data/profiles',
  imagePath: './data/profiles/images'
};