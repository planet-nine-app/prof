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

  // List all profiles (for admin/testing purposes)
  async listProfiles() {
    try {
      const files = fs.readdirSync(config.dataPath);
      const profiles = files
        .filter(file => file.endsWith('.json'))
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