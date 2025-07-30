import { expect } from 'chai';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the server
let app;
try {
  const serverModule = await import('../../src/server/node/prof.js');
  app = serverModule.default;
} catch (error) {
  console.error('Failed to import server:', error);
  process.exit(1);
}

describe('Prof Server Tests', () => {
  const testUUID = 'test-user-' + Date.now();
  const timestamp = Date.now();
  
  // Test profile data
  const testProfile = {
    name: 'Test User',
    email: 'test@example.com',
    bio: 'Test bio for profile',
    location: 'Test City',
    website: 'https://test.example.com'
  };

  // Test image data (small PNG)
  const testImageData = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  before(() => {
    console.log('Starting Prof Server Tests');
  });

  after(() => {
    console.log('Prof Server Tests completed');
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).to.have.property('status', 'healthy');
      expect(response.body).to.have.property('service', 'prof');
      expect(response.body).to.have.property('version');
    });
  });

  describe('Profile Creation', () => {
    it('should create a profile without image', async () => {
      const response = await request(app)
        .post(`/user/${testUUID}/profile`)
        .field('profileData', JSON.stringify(testProfile))
        .field('timestamp', timestamp)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('profile');
      expect(response.body.profile).to.have.property('uuid', testUUID);
      expect(response.body.profile).to.have.property('name', testProfile.name);
      expect(response.body.profile).to.have.property('email', testProfile.email);
      expect(response.body.profile).to.have.property('createdAt');
      expect(response.body.profile).to.have.property('updatedAt');
    });

    it('should fail to create duplicate profile', async () => {
      const response = await request(app)
        .post(`/user/${testUUID}/profile`)
        .field('profileData', JSON.stringify(testProfile))
        .field('timestamp', Date.now())
        .expect(400);

      expect(response.body).to.have.property('error', 'Profile already exists');
    });

    it('should fail with invalid profile data', async () => {
      const invalidProfile = {
        name: '', // Empty name should fail validation
        email: 'invalid-email' // Invalid email format
      };

      const response = await request(app)
        .post(`/user/invalid-test/profile`)
        .field('profileData', JSON.stringify(invalidProfile))
        .field('timestamp', Date.now())
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
      expect(response.body).to.have.property('details');
      expect(response.body.details).to.be.an('array');
    });

    it('should create profile with image', async () => {
      const testUUIDWithImage = 'test-user-image-' + Date.now();
      
      const response = await request(app)
        .post(`/user/${testUUIDWithImage}/profile`)
        .field('profileData', JSON.stringify(testProfile))
        .field('timestamp', Date.now())
        .attach('image', testImageData, 'test.png')
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.profile).to.have.property('imageFilename');
      expect(response.body.profile.imageFilename).to.match(/\.jpg$/); // Should be converted to JPG
    });
  });

  describe('Profile Retrieval', () => {
    it('should get existing profile', async () => {
      const response = await request(app)
        .get(`/user/${testUUID}/profile`)
        .query({ timestamp: Date.now() })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.profile).to.have.property('uuid', testUUID);
      expect(response.body.profile).to.have.property('name', testProfile.name);
    });

    it('should return 404 for non-existent profile', async () => {
      const response = await request(app)
        .get('/user/non-existent-uuid/profile')
        .query({ timestamp: Date.now() })
        .expect(404);

      expect(response.body).to.have.property('error', 'Profile not found');
    });
  });

  describe('Profile Updates', () => {
    it('should update profile data', async () => {
      const updatedProfile = {
        ...testProfile,
        name: 'Updated Test User',
        bio: 'Updated bio information'
      };

      const response = await request(app)
        .put(`/user/${testUUID}/profile`)
        .field('profileData', JSON.stringify(updatedProfile))
        .field('timestamp', Date.now())
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.profile).to.have.property('name', 'Updated Test User');
      expect(response.body.profile).to.have.property('bio', 'Updated bio information');
      expect(response.body.profile).to.have.property('updatedAt');
    });

    it('should update profile with new image', async () => {
      const response = await request(app)
        .put(`/user/${testUUID}/profile`)
        .field('profileData', JSON.stringify(testProfile))
        .field('timestamp', Date.now())
        .attach('image', testImageData, 'updated.png')
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.profile).to.have.property('imageFilename');
    });

    it('should fail to update non-existent profile', async () => {
      const response = await request(app)
        .put('/user/non-existent/profile')
        .field('profileData', JSON.stringify(testProfile))
        .field('timestamp', Date.now())
        .expect(404);

      expect(response.body).to.have.property('error', 'Profile not found');
    });
  });

  describe('Profile Images', () => {
    let testUUIDWithImage;

    before(async () => {
      // Create a profile with an image for testing
      testUUIDWithImage = 'test-image-user-' + Date.now();
      await request(app)
        .post(`/user/${testUUIDWithImage}/profile`)
        .field('profileData', JSON.stringify(testProfile))
        .field('timestamp', Date.now())
        .attach('image', testImageData, 'test.png')
        .expect(200);
    });

    it('should retrieve profile image', async () => {
      const response = await request(app)
        .get(`/user/${testUUIDWithImage}/profile/image`)
        .query({ timestamp: Date.now() })
        .expect(200)
        .expect('Content-Type', 'image/jpeg');

      expect(response.body).to.be.instanceOf(Buffer);
      expect(response.body.length).to.be.greaterThan(0);
    });

    it('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .get(`/user/${testUUID}/profile/image`) // testUUID doesn't have an image
        .query({ timestamp: Date.now() })
        .expect(404);

      expect(response.body).to.have.property('error', 'Image not found');
    });
  });

  describe('Profile Deletion', () => {
    it('should delete existing profile', async () => {
      const response = await request(app)
        .delete(`/user/${testUUID}/profile`)
        .send({ timestamp: Date.now() })
        .expect(200);

      expect(response.body).to.have.property('success', true);
    });

    it('should return 404 when deleting non-existent profile', async () => {
      const response = await request(app)
        .delete(`/user/${testUUID}/profile`)
        .send({ timestamp: Date.now() })
        .expect(404);

      expect(response.body).to.have.property('error', 'Profile not found');
    });
  });

  describe('MAGIC Spells', () => {
    it('should return error for non-existent spell', async () => {
      const response = await request(app)
        .post('/magic/spell/nonExistentSpell')
        .send({ timestamp: Date.now() })
        .expect(404);

      expect(response.body).to.have.property('error', 'Spell not found');
    });

    it('should return not implemented for existing spells', async () => {
      const response = await request(app)
        .post('/magic/spell/getProfileSummary')
        .send({ timestamp: Date.now() })
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body.error).to.include('Not implemented');
    });
  });

  describe('Error Handling', () => {
    it('should reject requests with old timestamps', async () => {
      const oldTimestamp = Date.now() - 400000; // 400 seconds ago

      const response = await request(app)
        .get(`/user/test/profile`)
        .query({ timestamp: oldTimestamp })
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('timestamp');
    });

    it('should handle file upload errors gracefully', async () => {
      // Create a large buffer to exceed file size limit
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

      const response = await request(app)
        .post('/user/test-large/profile')
        .field('profileData', JSON.stringify(testProfile))
        .field('timestamp', Date.now())
        .attach('image', largeBuffer, 'large.png')
        .expect(400);

      expect(response.body).to.have.property('error', 'File too large');
    });

    it('should reject invalid file types', async () => {
      const textData = Buffer.from('This is not an image');

      const response = await request(app)
        .post('/user/test-invalid-file/profile')
        .field('profileData', JSON.stringify(testProfile))
        .field('timestamp', Date.now())
        .attach('image', textData, 'test.txt')
        .expect(400);

      expect(response.body).to.have.property('error');
    });
  });

  describe('Validation', () => {
    it('should enforce name length limits', async () => {
      const longProfile = {
        name: 'A'.repeat(200), // Exceeds 100 char limit
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/user/test-long-name/profile')
        .field('profileData', JSON.stringify(longProfile))
        .field('timestamp', Date.now())
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
      expect(response.body.details).to.include.something.that.includes('Name must be less than');
    });

    it('should enforce email format', async () => {
      const invalidEmailProfile = {
        name: 'Test User',
        email: 'not-an-email'
      };

      const response = await request(app)
        .post('/user/test-invalid-email/profile')
        .field('profileData', JSON.stringify(invalidEmailProfile))
        .field('timestamp', Date.now())
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
      expect(response.body.details).to.include.something.that.includes('Email must be in valid format');
    });

    it('should limit number of additional fields', async () => {
      const manyFieldsProfile = {
        name: 'Test User',
        email: 'test@example.com'
      };

      // Add 25 additional fields (exceeding the 20 limit)
      for (let i = 0; i < 25; i++) {
        manyFieldsProfile[`field${i}`] = `value${i}`;
      }

      const response = await request(app)
        .post('/user/test-many-fields/profile')
        .field('profileData', JSON.stringify(manyFieldsProfile))
        .field('timestamp', Date.now())
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
      expect(response.body.details).to.include.something.that.includes('Too many additional fields');
    });
  });
});