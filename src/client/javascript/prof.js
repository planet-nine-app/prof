import fetch from 'node-fetch';
import sessionless from 'sessionless-node';

class ProfClient {
  constructor(baseURL = 'http://localhost:3007') {
    this.baseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    this.keys = null;
  }

  // Initialize with sessionless keys
  setKeys(keys) {
    this.keys = keys;
  }

  // Generate authentication parameters
  _getAuthParams() {
    if (!this.keys) {
      throw new Error('Keys not set. Call setKeys() first.');
    }
    
    const timestamp = new Date().getTime();
    const hash = sessionless.generateUUID();
    const signature = sessionless.sign(this.keys.privateKey, this.keys.uuid, timestamp);
    
    return {
      uuid: this.keys.uuid,
      timestamp,
      hash,
      signature
    };
  }

  // Create form data for multipart requests
  _createFormData(profileData, imageFile = null) {
    // In Node.js environment, we need to handle FormData differently
    // This is a simplified version - in browser, use native FormData
    const boundary = '----formdata-prof-' + Math.random().toString(36);
    let body = '';
    
    // Add profile data
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="profileData"\r\n\r\n';
    body += JSON.stringify(profileData) + '\r\n';
    
    // Add auth params
    const auth = this._getAuthParams();
    Object.keys(auth).forEach(key => {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += auth[key] + '\r\n';
    });
    
    // Add image if provided
    if (imageFile) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="image"; filename="${imageFile.name}"\r\n`;
      body += `Content-Type: ${imageFile.type}\r\n\r\n`;
      // Note: In real implementation, imageFile.buffer would be added here
      body += '[IMAGE_BUFFER_PLACEHOLDER]\r\n';
    }
    
    body += `--${boundary}--\r\n`;
    
    return {
      body,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    };
  }

  // Create profile
  async createProfile(profileData, imageFile = null) {
    try {
      const auth = this._getAuthParams();
      
      let requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (imageFile) {
        // For image uploads, use FormData
        const formData = this._createFormData(profileData, imageFile);
        requestOptions = {
          method: 'POST',
          body: formData.body,
          headers: formData.headers
        };
      } else {
        // For JSON-only requests
        requestOptions.body = JSON.stringify({
          ...auth,
          profileData
        });
      }

      const response = await fetch(`${this.baseURL}/user/${auth.uuid}/profile`, requestOptions);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create profile');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  // Update profile
  async updateProfile(profileData, imageFile = null) {
    try {
      const auth = this._getAuthParams();
      
      let requestOptions = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (imageFile) {
        // For image uploads, use FormData
        const formData = this._createFormData(profileData, imageFile);
        requestOptions = {
          method: 'PUT',
          body: formData.body,
          headers: formData.headers
        };
      } else {
        // For JSON-only requests
        requestOptions.body = JSON.stringify({
          ...auth,
          profileData
        });
      }

      const response = await fetch(`${this.baseURL}/user/${auth.uuid}/profile`, requestOptions);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Get profile
  async getProfile(uuid = null) {
    try {
      const auth = this._getAuthParams();
      const targetUUID = uuid || auth.uuid;
      
      const queryParams = new URLSearchParams({
        timestamp: auth.timestamp,
        hash: auth.hash,
        signature: auth.signature
      });

      const response = await fetch(`${this.baseURL}/user/${targetUUID}/profile?${queryParams}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get profile');
      }
      
      return result;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  // Delete profile
  async deleteProfile() {
    try {
      const auth = this._getAuthParams();
      
      const response = await fetch(`${this.baseURL}/user/${auth.uuid}/profile`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(auth)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete profile');
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }

  // Get profile image
  async getProfileImage(uuid = null) {
    try {
      const auth = this._getAuthParams();
      const targetUUID = uuid || auth.uuid;
      
      const queryParams = new URLSearchParams({
        timestamp: auth.timestamp,
        hash: auth.hash,
        signature: auth.signature
      });

      const response = await fetch(`${this.baseURL}/user/${targetUUID}/profile/image?${queryParams}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get profile image');
      }
      
      return response.buffer(); // Returns image buffer
    } catch (error) {
      console.error('Error getting profile image:', error);
      throw error;
    }
  }

  // Get profile image URL (for use in img tags)
  getProfileImageURL(uuid = null) {
    const auth = this._getAuthParams();
    const targetUUID = uuid || auth.uuid;
    
    const queryParams = new URLSearchParams({
      timestamp: auth.timestamp,
      hash: auth.hash,
      signature: auth.signature
    });

    return `${this.baseURL}/user/${targetUUID}/profile/image?${queryParams}`;
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Execute MAGIC spell (for future integrations)
  async executeSpell(spellName, spellData) {
    try {
      const auth = this._getAuthParams();
      
      const response = await fetch(`${this.baseURL}/magic/spell/${spellName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...auth,
          ...spellData
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Spell execution failed');
      }
      
      return result;
    } catch (error) {
      console.error('Error executing spell:', error);
      throw error;
    }
  }
}

// Factory function for creating prof client
const prof = {
  baseURL: 'http://localhost:3007',
  
  createClient(baseURL = null) {
    return new ProfClient(baseURL || this.baseURL);
  },

  // Convenience method for quick client creation
  async createUser(saveKeys, getKeys, baseURL = null) {
    const client = this.createClient(baseURL);
    
    // Generate keys if not provided
    const keys = getKeys ? getKeys() : sessionless.generateKeys();
    if (saveKeys) {
      saveKeys(keys);
    }
    
    client.setKeys(keys);
    return client;
  }
};

export default prof;
export { ProfClient };