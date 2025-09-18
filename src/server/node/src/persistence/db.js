import fs from 'fs';
import path from 'path';
import config from '../../config/local.js';

// Ensure data directories exist
const ensureDirectories = () => {
  if (!fs.existsSync(config.dataPath)) {
    fs.mkdirSync(config.dataPath, { recursive: true });
  }
  if (!fs.existsSync(config.imagePath)) {
    fs.mkdirSync(config.imagePath, { recursive: true });
  }
};

ensureDirectories();

const db = {
  // Profile operations
  async getProfile(uuid) {
    try {
      const profilePath = path.join(config.dataPath, `${uuid}.json`);
      if (!fs.existsSync(profilePath)) {
        return null;
      }
      const data = fs.readFileSync(profilePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading profile:', err);
      return null;
    }
  },

  async putProfile(uuid, profileData) {
    try {
      const profilePath = path.join(config.dataPath, `${uuid}.json`);
      const dataToSave = {
        ...profileData,
        uuid,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(profilePath, JSON.stringify(dataToSave, null, 2));
      return dataToSave;
    } catch (err) {
      console.error('Error saving profile:', err);
      return null;
    }
  },

  async deleteProfile(uuid) {
    try {
      const profilePath = path.join(config.dataPath, `${uuid}.json`);
      if (fs.existsSync(profilePath)) {
        fs.unlinkSync(profilePath);
        
        // Also delete associated image if it exists
        const profile = await this.getProfile(uuid);
        if (profile && profile.imageFilename) {
          const imagePath = path.join(config.imagePath, profile.imageFilename);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
        
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting profile:', err);
      return false;
    }
  },

  // Image operations
  async saveImage(filename, buffer) {
    try {
      const imagePath = path.join(config.imagePath, filename);
      fs.writeFileSync(imagePath, buffer);
      return true;
    } catch (err) {
      console.error('Error saving image:', err);
      return false;
    }
  },

  async getImage(filename) {
    try {
      const imagePath = path.join(config.imagePath, filename);
      if (!fs.existsSync(imagePath)) {
        return null;
      }
      return fs.readFileSync(imagePath);
    } catch (err) {
      console.error('Error reading image:', err);
      return null;
    }
  },

  async deleteImage(filename) {
    try {
      const imagePath = path.join(config.imagePath, filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting image:', err);
      return false;
    }
  },

  // Tag operations
  async addProfileToTag(tag, profile) {
    try {
      const tagPath = path.join(config.dataPath, `tag_${tag}.json`);
      let tagData = {};

      // Get existing tag file or create new object
      if (fs.existsSync(tagPath)) {
        const data = fs.readFileSync(tagPath, 'utf8');
        tagData = JSON.parse(data);
      }

      // Set property with uuid as key and profile as value
      tagData[profile.uuid] = profile;

      // Save the tag file
      fs.writeFileSync(tagPath, JSON.stringify(tagData, null, 2));
      return true;
    } catch (err) {
      console.error('Error adding profile to tag:', err);
      return false;
    }
  },

  async removeProfileFromTag(tag, uuid) {
    try {
      const tagPath = path.join(config.dataPath, `tag_${tag}.json`);

      if (!fs.existsSync(tagPath)) {
        return true; // Tag doesn't exist, nothing to remove
      }

      const data = fs.readFileSync(tagPath, 'utf8');
      const tagData = JSON.parse(data);

      // Remove the profile
      delete tagData[uuid];

      // Save the updated tag file
      fs.writeFileSync(tagPath, JSON.stringify(tagData, null, 2));
      return true;
    } catch (err) {
      console.error('Error removing profile from tag:', err);
      return false;
    }
  },

  async getProfilesByTag(tag) {
    try {
      const tagPath = path.join(config.dataPath, `tag_${tag}.json`);

      if (!fs.existsSync(tagPath)) {
        return []; // Tag doesn't exist, return empty array
      }

      const data = fs.readFileSync(tagPath, 'utf8');
      const tagData = JSON.parse(data);

      // Return array of profiles
      return Object.values(tagData);
    } catch (err) {
      console.error('Error getting profiles by tag:', err);
      return [];
    }
  },

  // List all profiles (for admin/testing purposes or when no tag filter)
  async listProfiles(tags = null) {
    try {
      // If tags are specified, use the optimized tag lookup
      if (tags && tags.length > 0) {
        const allTaggedProfiles = [];
        const seenUuids = new Set();

        for (const tag of tags) {
          const profiles = await this.getProfilesByTag(tag);
          profiles.forEach(profile => {
            if (!seenUuids.has(profile.uuid)) {
              seenUuids.add(profile.uuid);
              allTaggedProfiles.push(profile);
            }
          });
        }

        return allTaggedProfiles;
      }

      // Fallback to scanning all profile files (original behavior)
      const files = fs.readdirSync(config.dataPath);
      const profiles = files
        .filter(file => file.endsWith('.json') && !file.startsWith('tag_'))
        .map(file => {
          const uuid = file.replace('.json', '');
          const data = fs.readFileSync(path.join(config.dataPath, file), 'utf8');
          return JSON.parse(data);
        });
      return profiles;
    } catch (err) {
      console.error('Error listing profiles:', err);
      return [];
    }
  }
};

export default db;