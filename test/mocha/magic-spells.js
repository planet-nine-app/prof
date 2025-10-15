import { should } from 'chai';
should();
import sessionless from 'sessionless-node';
import fount from 'fount-js';
import fs from 'fs';
import path from 'path';

const baseURL = process.env.SUB_DOMAIN ? `https://${process.env.SUB_DOMAIN}.fount.allyabase.com/` : 'http://127.0.0.1:3006/';
fount.baseURL = baseURL;

let keys = {};
let fountUser = {};
let testProfileUuid = null;

// Helper function to create base64 encoded image data (1x1 red pixel PNG)
function createTestImageData() {
  const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  return base64Data;
}

describe('Prof MAGIC Spell Tests', () => {

  before(async () => {
    // Generate keys for testing
    keys = await sessionless.generateKeys(() => { return keys; }, () => { return keys; });

    // Create fount user for spell casting
    fountUser = await fount.createUser(() => keys, () => keys);
    console.log('Created fount user:', fountUser.uuid);

    testProfileUuid = fountUser.uuid; // Use fount user UUID for profile
  });

  it('should create profile via profUserProfile spell', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'profUserProfile',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 0,
      components: {
        uuid: testProfileUuid,
        profileData: {
          uuid: testProfileUuid,
          name: 'Test User',
          email: 'test@example.com',
          bio: 'This is a test profile',
          tags: ['developer', 'tester']
        }
      }
    };

    // Sign the spell
    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    // Cast the spell
    const result = await fount.castSpell('profUserProfile', spell);

    console.log('profUserProfile result:', result);

    result.should.have.property('success', true);
    result.should.have.property('profile');
    result.profile.should.have.property('name', 'Test User');
    result.profile.should.have.property('email', 'test@example.com');
    result.profile.should.have.property('tags');
    result.profile.tags.should.include('developer');
  });

  it('should create profile with image via profUserProfile spell', async () => {
    const timestamp = Date.now().toString();
    const imageUuid = sessionless.generateUUID();

    const spell = {
      spell: 'profUserProfile',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 1,
      components: {
        uuid: imageUuid,
        profileData: {
          uuid: imageUuid,
          name: 'Image Test User',
          email: 'imagetest@example.com'
        },
        imageData: createTestImageData(),
        imageExtension: '.png'
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('profUserProfile', spell);

    console.log('profUserProfile with image result:', result);

    result.should.have.property('success', true);
    result.should.have.property('profile');
    result.profile.should.have.property('imageFilename');
    result.profile.imageFilename.should.not.be.null;
  });

  it('should update profile via profUserProfileUpdate spell', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'profUserProfileUpdate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 2,
      components: {
        uuid: testProfileUuid,
        profileData: {
          name: 'Updated Test User',
          bio: 'Updated bio information',
          tags: ['developer', 'tester', 'magician']
        }
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('profUserProfileUpdate', spell);

    console.log('profUserProfileUpdate result:', result);

    result.should.have.property('success', true);
    result.should.have.property('profile');
    result.profile.should.have.property('name', 'Updated Test User');
    result.profile.should.have.property('bio', 'Updated bio information');
    result.profile.tags.should.include('magician');
  });

  it('should update profile with new image via profUserProfileUpdate spell', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'profUserProfileUpdate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 3,
      components: {
        uuid: testProfileUuid,
        profileData: {
          bio: 'Profile with updated image'
        },
        imageData: createTestImageData(),
        imageExtension: '.png'
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('profUserProfileUpdate', spell);

    console.log('profUserProfileUpdate with image result:', result);

    result.should.have.property('success', true);
    result.should.have.property('profile');
    result.profile.should.have.property('imageFilename');
  });

  it('should delete profile via profUserProfileDelete spell', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'profUserProfileDelete',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 4,
      components: {
        uuid: testProfileUuid
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('profUserProfileDelete', spell);

    console.log('profUserProfileDelete result:', result);

    result.should.have.property('success', true);
  });

  it('should fail to create profile with missing uuid', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'profUserProfile',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 5,
      components: {
        profileData: {
          name: 'Test User'
        }
        // Missing uuid
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('profUserProfile', spell);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

  it('should fail to create profile with missing profileData', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'profUserProfile',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 6,
      components: {
        uuid: sessionless.generateUUID()
        // Missing profileData
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('profUserProfile', spell);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

  it('should fail to update non-existent profile', async () => {
    const timestamp = Date.now().toString();
    const nonExistentUuid = sessionless.generateUUID();

    const spell = {
      spell: 'profUserProfileUpdate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 7,
      components: {
        uuid: nonExistentUuid,
        profileData: {
          name: 'Should Fail'
        }
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('profUserProfileUpdate', spell);

    result.should.have.property('success', false);
    result.should.have.property('error', 'Profile not found');
  });

  it('should fail to delete non-existent profile', async () => {
    const timestamp = Date.now().toString();
    const nonExistentUuid = sessionless.generateUUID();

    const spell = {
      spell: 'profUserProfileDelete',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 8,
      components: {
        uuid: nonExistentUuid
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('profUserProfileDelete', spell);

    result.should.have.property('success', false);
    result.should.have.property('error', 'Profile not found');
  });

  it('should fail to update profile with missing uuid', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'profUserProfileUpdate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 9,
      components: {
        profileData: {
          name: 'Should Fail'
        }
        // Missing uuid
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('profUserProfileUpdate', spell);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

});
