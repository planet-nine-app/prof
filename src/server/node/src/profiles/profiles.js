import db from '../persistence/db.js';
import config from '../../config/local.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const profiles = {
  // Validate profile data
  validateProfile(profileData) {
    const errors = [];
    
    // Required fields
    if (!profileData.name || typeof profileData.name !== 'string') {
      errors.push('Name is required and must be a string');
    } else if (profileData.name.length > config.profileLimits.maxNameLength) {
      errors.push(`Name must be less than ${config.profileLimits.maxNameLength} characters`);
    }
    
    if (!profileData.email || typeof profileData.email !== 'string') {
      errors.push('Email is required and must be a string');
    } else if (profileData.email.length > config.profileLimits.maxEmailLength) {
      errors.push(`Email must be less than ${config.profileLimits.maxEmailLength} characters`);
    }
    
    // Email format validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (profileData.email && !emailRegex.test(profileData.email)) {
      errors.push('Email must be in valid format');
    }
    
    // Check additional fields
    const additionalFields = Object.keys(profileData).filter(
      key => !['name', 'email', 'image', 'imageFilename'].includes(key)
    );
    
    if (additionalFields.length > config.profileLimits.maxFields) {
      errors.push(`Too many additional fields. Maximum ${config.profileLimits.maxFields} allowed`);
    }
    
    // Validate additional field lengths
    for (const field of additionalFields) {
      const value = profileData[field];
      if (typeof value === 'string' && value.length > config.profileLimits.maxFieldLength) {
        errors.push(`Field '${field}' exceeds maximum length of ${config.profileLimits.maxFieldLength} characters`);
      }
    }
    
    return errors;
  },

  // Process and resize image
  async processImage(imageBuffer, originalName) {
    try {
      // Generate unique filename
      const ext = path.extname(originalName).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      
      // Process image with sharp
      const processedBuffer = await sharp(imageBuffer)
        .resize(config.imageResolution.maxWidth, config.imageResolution.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 }) // Convert to JPEG for consistency
        .toBuffer();
      
      // Save processed image
      const saved = await db.saveImage(filename.replace(ext, '.jpg'), processedBuffer);
      
      if (saved) {
        return filename.replace(ext, '.jpg');
      }
      
      return null;
    } catch (err) {
      console.error('Error processing image:', err);
      return null;
    }
  },

  // Create new profile
  async createProfile(uuid, profileData, imageBuffer = null, originalImageName = null) {
    try {
      // Check if profile already exists
      const existingProfile = await db.getProfile(uuid);
      if (existingProfile) {
        return { error: 'Profile already exists' };
      }
      
      // Validate profile data
      const validationErrors = this.validateProfile(profileData);
      if (validationErrors.length > 0) {
        return { error: 'Validation failed', details: validationErrors };
      }
      
      // Process image if provided
      let imageFilename = null;
      if (imageBuffer && originalImageName) {
        imageFilename = await this.processImage(imageBuffer, originalImageName);
        if (!imageFilename) {
          return { error: 'Failed to process image' };
        }
      }
      
      // Create profile data
      const profile = {
        ...profileData,
        imageFilename,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save profile
      const savedProfile = await db.putProfile(uuid, profile);
      if (!savedProfile) {
        // Clean up image if profile save failed
        if (imageFilename) {
          await db.deleteImage(imageFilename);
        }
        return { error: 'Failed to save profile' };
      }
      
      return { success: true, profile: savedProfile };
    } catch (err) {
      console.error('Error creating profile:', err);
      return { error: 'Internal server error' };
    }
  },

  // Update existing profile
  async updateProfile(uuid, profileData, imageBuffer = null, originalImageName = null) {
    try {
      // Get existing profile
      const existingProfile = await db.getProfile(uuid);
      if (!existingProfile) {
        return { error: 'Profile not found' };
      }
      
      // Validate new profile data
      const validationErrors = this.validateProfile(profileData);
      if (validationErrors.length > 0) {
        return { error: 'Validation failed', details: validationErrors };
      }
      
      // Process new image if provided
      let imageFilename = existingProfile.imageFilename;
      if (imageBuffer && originalImageName) {
        // Delete old image
        if (existingProfile.imageFilename) {
          await db.deleteImage(existingProfile.imageFilename);
        }
        
        // Process and save new image
        imageFilename = await this.processImage(imageBuffer, originalImageName);
        if (!imageFilename) {
          return { error: 'Failed to process image' };
        }
      }
      
      // Update profile data
      const updatedProfile = {
        ...existingProfile,
        ...profileData,
        imageFilename,
        createdAt: existingProfile.createdAt, // Preserve creation date
        updatedAt: new Date().toISOString()
      };
      
      // Save updated profile
      const savedProfile = await db.putProfile(uuid, updatedProfile);
      if (!savedProfile) {
        return { error: 'Failed to update profile' };
      }
      
      return { success: true, profile: savedProfile };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { error: 'Internal server error' };
    }
  },

  // Get profile
  async getProfile(uuid) {
    try {
      const profile = await db.getProfile(uuid);
      if (!profile) {
        return { error: 'Profile not found' };
      }
      
      return { success: true, profile };
    } catch (err) {
      console.error('Error getting profile:', err);
      return { error: 'Internal server error' };
    }
  },

  // Delete profile
  async deleteProfile(uuid) {
    try {
      const existingProfile = await db.getProfile(uuid);
      if (!existingProfile) {
        return { error: 'Profile not found' };
      }
      
      // Delete profile and associated image
      const deleted = await db.deleteProfile(uuid);
      if (!deleted) {
        return { error: 'Failed to delete profile' };
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting profile:', err);
      return { error: 'Internal server error' };
    }
  },

  // Get profile image
  async getProfileImage(uuid) {
    try {
      const profile = await db.getProfile(uuid);
      if (!profile || !profile.imageFilename) {
        return { error: 'Image not found' };
      }
      
      const imageBuffer = await db.getImage(profile.imageFilename);
      if (!imageBuffer) {
        return { error: 'Image file not found' };
      }
      
      return { success: true, image: imageBuffer, filename: profile.imageFilename };
    } catch (err) {
      console.error('Error getting profile image:', err);
      return { error: 'Internal server error' };
    }
  }
};

export default profiles;