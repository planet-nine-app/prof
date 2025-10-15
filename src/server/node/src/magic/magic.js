// MAGIC spells for prof service
// Prof handles user profile management with PII data

const PROF_URL = process.env.PROF_URL || 'http://127.0.0.1:3008/';

const MAGIC = {
  /**
   * profUserProfile - Create a user profile
   *
   * Expected spell components:
   * - uuid: User UUID
   * - profileData: Profile data object (name, email, bio, tags, etc.)
   * - imageData: Base64-encoded image data (optional)
   * - imageExtension: Image file extension (e.g., '.jpg', '.png') (optional)
   */
  async profUserProfile(spell) {
    try {
      console.log('🪄 Prof resolving profUserProfile spell');

      const { uuid, profileData, imageData, imageExtension } = spell.components;

      if (!uuid || !profileData) {
        return {
          success: false,
          error: 'Missing required spell components: uuid, profileData'
        };
      }

      // Import profiles module dynamically to avoid circular dependencies
      const profilesModule = await import('../profiles/profiles.js');
      const profiles = profilesModule.default;

      // Decode base64 image if provided
      let imageBuffer = null;
      let originalImageName = null;
      if (imageData && imageExtension) {
        imageBuffer = Buffer.from(imageData, 'base64');
        originalImageName = `image${imageExtension}`;
      }

      // Create profile
      const result = await profiles.createProfile(uuid, profileData, imageBuffer, originalImageName);

      if (result.error) {
        console.error('❌ Prof profile creation failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }

      console.log('✅ Profile created:', uuid);

      return {
        success: true,
        profile: result.profile
      };

    } catch (error) {
      console.error('❌ profUserProfile spell failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * profUserProfileUpdate - Update a user profile
   *
   * Expected spell components:
   * - uuid: User UUID
   * - profileData: Updated profile data object
   * - imageData: Base64-encoded image data (optional)
   * - imageExtension: Image file extension (optional)
   */
  async profUserProfileUpdate(spell) {
    try {
      console.log('🪄 Prof resolving profUserProfileUpdate spell');

      const { uuid, profileData, imageData, imageExtension } = spell.components;

      if (!uuid || !profileData) {
        return {
          success: false,
          error: 'Missing required spell components: uuid, profileData'
        };
      }

      // Import profiles module dynamically
      const profilesModule = await import('../profiles/profiles.js');
      const profiles = profilesModule.default;

      // Decode base64 image if provided
      let imageBuffer = null;
      let originalImageName = null;
      if (imageData && imageExtension) {
        imageBuffer = Buffer.from(imageData, 'base64');
        originalImageName = `image${imageExtension}`;
      }

      // Update profile
      const result = await profiles.updateProfile(uuid, profileData, imageBuffer, originalImageName);

      if (result.error) {
        console.error('❌ Prof profile update failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }

      console.log('✅ Profile updated:', uuid);

      return {
        success: true,
        profile: result.profile
      };

    } catch (error) {
      console.error('❌ profUserProfileUpdate spell failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * profUserProfileDelete - Delete a user profile
   *
   * Expected spell components:
   * - uuid: User UUID
   */
  async profUserProfileDelete(spell) {
    try {
      console.log('🪄 Prof resolving profUserProfileDelete spell');

      const { uuid } = spell.components;

      if (!uuid) {
        return {
          success: false,
          error: 'Missing required spell component: uuid'
        };
      }

      // Import profiles module dynamically
      const profilesModule = await import('../profiles/profiles.js');
      const profiles = profilesModule.default;

      // Delete profile
      const result = await profiles.deleteProfile(uuid);

      if (result.error) {
        console.error('❌ Prof profile deletion failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }

      console.log('✅ Profile deleted:', uuid);

      return {
        success: true
      };

    } catch (error) {
      console.error('❌ profUserProfileDelete spell failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Legacy placeholder functions
  async getProfileSummary(spell) {
    try {
      // Future: Return non-PII profile summary for cross-service use
      return {
        success: false,
        error: 'Not implemented - prof operates independently for PII protection'
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  },

  async validateProfileAccess(spell) {
    try {
      // Future: Validate access permissions for profile data
      return {
        success: false,
        error: 'Not implemented - prof operates independently for PII protection'
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
};

export default MAGIC;