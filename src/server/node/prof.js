import config from './config/local.js';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import profiles from './src/profiles/profiles.js';
import MAGIC from './src/magic/magic.js';
import sessionless from 'sessionless-node';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxImageSize
  },
  fileFilter: (req, file, cb) => {
    if (config.allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and WebP are allowed.'));
    }
  }
});

// Middleware to validate timestamp
app.use((req, res, next) => {
  console.log('Prof service received request to:', req.path);
  const requestTime = +req.query.timestamp || +req.body.timestamp;
  const now = new Date().getTime();
  if (Math.abs(now - requestTime) > config.allowedTimeDifference) {
    return res.status(400).send({ error: 'Request timestamp too old or too far in future' });
  }
  next();
});

// Middleware to validate sessionless signature
const validateSignature = async (req, res, next) => {
  try {
    const { uuid, timestamp, signature, hash } = req.method === 'GET' ? req.query : req.body;
    
    if (!uuid || !timestamp || !signature) {
      return res.status(400).send({ error: 'Missing required authentication parameters' });
    }

    // For prof, we validate the signature directly since it operates independently
    // In a production environment, you would verify against a user registry
    const isValid = sessionless.verifySignature(signature, uuid, timestamp);
    
    if (!isValid) {
      return res.status(403).send({ error: 'Invalid signature' });
    }
    
    req.userUUID = uuid;
    next();
  } catch (err) {
    console.error('Signature validation error:', err);
    res.status(403).send({ error: 'Authentication failed' });
  }
};

// Routes

// Create profile
app.post('/user/:uuid/profile', upload.single('image'), async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const profileData = JSON.parse(req.body.profileData || '{}');
    const imageBuffer = req.file ? req.file.buffer : null;
    const originalImageName = req.file ? req.file.originalname : null;
    
    // Basic validation that UUID matches request
    if (uuid !== profileData.uuid && profileData.uuid) {
      return res.status(400).send({ error: 'UUID mismatch' });
    }
    
    const result = await profiles.createProfile(uuid, profileData, imageBuffer, originalImageName);
    
    if (result.error) {
      return res.status(400).send(result);
    }
    
    res.send(result);
  } catch (err) {
    console.error('Error creating profile:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// Update profile
app.put('/user/:uuid/profile', upload.single('image'), async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const profileData = JSON.parse(req.body.profileData || '{}');
    const imageBuffer = req.file ? req.file.buffer : null;
    const originalImageName = req.file ? req.file.originalname : null;
    
    const result = await profiles.updateProfile(uuid, profileData, imageBuffer, originalImageName);
    
    if (result.error) {
      return res.status(result.error === 'Profile not found' ? 404 : 400).send(result);
    }
    
    res.send(result);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// Get profile
app.get('/user/:uuid/profile', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    
    const result = await profiles.getProfile(uuid);
    
    if (result.error) {
      return res.status(404).send(result);
    }
    
    res.send(result);
  } catch (err) {
    console.error('Error getting profile:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// Delete profile
app.delete('/user/:uuid/profile', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    
    const result = await profiles.deleteProfile(uuid);
    
    if (result.error) {
      return res.status(404).send(result);
    }
    
    res.send(result);
  } catch (err) {
    console.error('Error deleting profile:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// Get profile image
app.get('/user/:uuid/profile/image', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    
    const result = await profiles.getProfileImage(uuid);
    
    if (result.error) {
      return res.status(404).send(result);
    }
    
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': result.image.length,
      'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
    });
    
    res.send(result.image);
  } catch (err) {
    console.error('Error getting profile image:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// MAGIC spell endpoint (for future integrations)
app.post('/magic/spell/:spellName', async (req, res) => {
  try {
    const spellName = req.params.spellName;
    const spell = req.body;
    
    if (!MAGIC[spellName]) {
      return res.status(404).send({ error: 'Spell not found' });
    }
    
    const spellResp = await MAGIC[spellName](spell);
    res.status(spellResp.success ? 200 : 400);
    return res.send(spellResp);
  } catch (err) {
    console.error('MAGIC spell error:', err);
    res.status(500).send({ error: 'Spell failed' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({ 
    status: 'healthy', 
    service: 'prof',
    version: '0.0.1',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send({ error: 'File too large' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).send({ error: 'Internal server error' });
});

const PORT = config.port || 3007;
app.listen(PORT, () => {
  console.log(`Prof service listening on port ${PORT}`);
  console.log('Ready to handle user profiles with PII data');
});

export default app;