import { expect } from 'chai';
import prof from 'prof-js';
import sessionless from 'sessionless-node';

describe('Prof Client Tests', () => {
  let profClient;
  let testKeys;
  
  const testProfile = {
    name: 'Client Test User',
    email: 'client-test@example.com',
    bio: 'Testing the prof client',
    location: 'Client Test City',
    website: 'https://client-test.example.com'
  };

  // Mock image data
  const mockImageFile = {
    name: 'test-avatar.png',
    type: 'image/png',
    size: 1024,
    buffer: Buffer.from('mock image data')
  };

  before(async () => {
    console.log('Starting Prof Client Tests');
    
    // Generate test keys
    testKeys = sessionless.generateKeys();
    
    // Create prof client
    profClient = prof.createClient('http://localhost:3007');
    profClient.setKeys(testKeys);
    
    console.log('Test keys generated:', testKeys.uuid);
  });

  after(() => {
    console.log('Prof Client Tests completed');
  });

  describe('Client Initialization', () => {
    it('should create prof client with default URL', () => {
      const client = prof.createClient();
      expect(client).to.be.an('object');
    });

    it('should create prof client with custom URL', () => {
      const client = prof.createClient('https://custom.prof-server.com');
      expect(client).to.be.an('object');
    });

    it('should handle createUser convenience method', async () => {
      let savedKeys = null;
      
      const client = await prof.createUser(
        (keys) => { savedKeys = keys; },
        () => savedKeys,
        'http://localhost:3007'
      );
      
      expect(client).to.be.an('object');
      expect(savedKeys).to.not.be.null;
      expect(savedKeys).to.have.property('uuid');
      expect(savedKeys).to.have.property('privateKey');
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      try {
        const health = await profClient.healthCheck();
        expect(health).to.have.property('status', 'healthy');
        expect(health).to.have.property('service', 'prof');
        expect(health).to.have.property('version');
      } catch (error) {
        // If server is not running, skip this test
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping health check test - server not running');
          this.skip();
        } else {
          throw error;
        }
      }
    });
  });

  describe('Profile Operations', () => {
    let profileCreated = false;

    it('should create a profile', async function() {
      try {
        const result = await profClient.createProfile(testProfile);
        
        expect(result).to.have.property('success', true);
        expect(result).to.have.property('profile');
        expect(result.profile).to.have.property('uuid', testKeys.uuid);
        expect(result.profile).to.have.property('name', testProfile.name);
        expect(result.profile).to.have.property('email', testProfile.email);
        expect(result.profile).to.have.property('createdAt');
        expect(result.profile).to.have.property('updatedAt');
        
        profileCreated = true;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping profile creation test - server not running');
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should get created profile', async function() {
      if (!profileCreated) {
        this.skip();
        return;
      }

      try {
        const result = await profClient.getProfile();
        
        expect(result).to.have.property('success', true);
        expect(result).to.have.property('profile');
        expect(result.profile).to.have.property('uuid', testKeys.uuid);
        expect(result.profile).to.have.property('name', testProfile.name);
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping get profile test - server not running');
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should update profile', async function() {
      if (!profileCreated) {
        this.skip();
        return;
      }

      const updatedProfile = {
        ...testProfile,
        name: 'Updated Client Test User',
        bio: 'Updated bio via client'
      };

      try {
        const result = await profClient.updateProfile(updatedProfile);
        
        expect(result).to.have.property('success', true);
        expect(result.profile).to.have.property('name', 'Updated Client Test User');
        expect(result.profile).to.have.property('bio', 'Updated bio via client');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping profile update test - server not running');
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should create profile with image', async function() {
      // Create a separate client for image testing
      const imageTestKeys = sessionless.generateKeys();
      const imageTestClient = prof.createClient('http://localhost:3007');
      imageTestClient.setKeys(imageTestKeys);

      try {
        const result = await imageTestClient.createProfile(testProfile, mockImageFile);
        
        expect(result).to.have.property('success', true);
        expect(result.profile).to.have.property('imageFilename');
        expect(result.profile.imageFilename).to.match(/\.jpg$/);
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping image profile creation test - server not running');
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should handle profile not found error', async function() {
      const nonExistentClient = prof.createClient('http://localhost:3007');
      const nonExistentKeys = sessionless.generateKeys();
      nonExistentClient.setKeys(nonExistentKeys);

      try {
        await nonExistentClient.getProfile();
        // Should not reach here
        expect.fail('Expected error for non-existent profile');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping profile not found test - server not running');
          this.skip();
        } else {
          expect(error.message).to.include('Profile not found');
        }
      }
    });

    it('should delete profile', async function() {
      if (!profileCreated) {
        this.skip();
        return;
      }

      try {
        const result = await profClient.deleteProfile();
        expect(result).to.have.property('success', true);
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping profile deletion test - server not running');
          this.skip();
        } else {
          throw error;
        }
      }
    });
  });

  describe('Image Operations', () => {
    let imageTestClient;
    let imageTestKeys;

    before(async () => {
      imageTestKeys = sessionless.generateKeys();
      imageTestClient = prof.createClient('http://localhost:3007');
      imageTestClient.setKeys(imageTestKeys);
    });

    it('should get profile image URL', async function() {
      try {
        const imageURL = imageTestClient.getProfileImageURL();
        expect(imageURL).to.be.a('string');
        expect(imageURL).to.include('/profile/image');
        expect(imageURL).to.include('timestamp=');
        expect(imageURL).to.include('signature=');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping image URL test - server not running');
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should handle image not found', async function() {
      try {
        await imageTestClient.getProfileImage();
        // Should not reach here
        expect.fail('Expected error for non-existent image');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping image not found test - server not running');
          this.skip();
        } else {
          expect(error.message).to.include('Image not found');
        }
      }
    });
  });

  describe('Validation Errors', () => {
    let validationTestClient;

    before(() => {
      const validationTestKeys = sessionless.generateKeys();
      validationTestClient = prof.createClient('http://localhost:3007');
      validationTestClient.setKeys(validationTestKeys);
    });

    it('should handle validation errors', async function() {
      const invalidProfile = {
        name: '', // Invalid: empty name
        email: 'not-an-email' // Invalid: bad email format
      };

      try {
        await validationTestClient.createProfile(invalidProfile);
        // Should not reach here
        expect.fail('Expected validation error');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping validation test - server not running');
          this.skip();
        } else {
          expect(error.message).to.include('Validation failed');
        }
      }
    });

    it('should handle profile already exists error', async function() {
      const testKeys2 = sessionless.generateKeys();
      const testClient2 = prof.createClient('http://localhost:3007');
      testClient2.setKeys(testKeys2);

      try {
        // Create profile first time
        await testClient2.createProfile(testProfile);
        
        // Try to create again - should fail
        await testClient2.createProfile(testProfile);
        
        // Should not reach here
        expect.fail('Expected profile already exists error');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping duplicate profile test - server not running');
          this.skip();
        } else {
          expect(error.message).to.include('Profile already exists');
        }
      }
    });
  });

  describe('MAGIC Spells', () => {
    it('should execute MAGIC spell', async function() {
      try {
        const result = await profClient.executeSpell('getProfileSummary', {
          includeFields: ['name', 'bio']
        });
        
        // Currently returns not implemented
        expect(result).to.have.property('success', false);
        expect(result.error).to.include('Not implemented');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping MAGIC spell test - server not running');
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should handle non-existent spell', async function() {
      try {
        await profClient.executeSpell('nonExistentSpell', {});
        // Should not reach here
        expect.fail('Expected spell not found error');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Skipping non-existent spell test - server not running');
          this.skip();
        } else {
          expect(error.message).to.include('Spell not found');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async function() {
      const offlineClient = prof.createClient('http://localhost:9999'); // Non-existent server
      offlineClient.setKeys(testKeys);

      try {
        await offlineClient.healthCheck();
        // Should not reach here
        expect.fail('Expected network error');
      } catch (error) {
        expect(error.code).to.equal('ECONNREFUSED');
      }
    });

    it('should require keys to be set', async function() {
      const noKeyClient = prof.createClient('http://localhost:3007');
      
      try {
        await noKeyClient.getProfile();
        // Should not reach here
        expect.fail('Expected keys not set error');
      } catch (error) {
        expect(error.message).to.include('Keys not set');
      }
    });
  });
});