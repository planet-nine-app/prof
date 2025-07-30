# Prof JavaScript Client

JavaScript client library for the Prof service - Planet Nine's profile management system with PII data support.

## Installation

```bash
npm install prof-js
```

## Usage

### Basic Setup

```javascript
import prof from 'prof-js';
import sessionless from 'sessionless-node';

// Create client
const profClient = prof.createClient('http://localhost:3007');

// Set up authentication keys
const keys = sessionless.generateKeys();
profClient.setKeys(keys);
```

### Quick Setup with Key Management

```javascript
import prof from 'prof-js';

// Create client with automatic key management
const profClient = await prof.createUser(
  (keys) => {
    // Save keys function
    localStorage.setItem('profKeys', JSON.stringify(keys));
  },
  () => {
    // Get keys function
    return JSON.parse(localStorage.getItem('profKeys') || '{}');
  },
  'http://localhost:3007' // Optional: custom base URL
);
```

### Profile Operations

#### Create Profile

```javascript
// Create profile with required fields
const result = await profClient.createProfile({
  name: 'John Doe',
  email: 'john@example.com'
});

// Create profile with additional fields
const result = await profClient.createProfile({
  name: 'John Doe',
  email: 'john@example.com',
  bio: 'Software developer and coffee enthusiast',
  location: 'San Francisco, CA',
  website: 'https://johndoe.dev'
});

console.log(result.profile);
```

#### Create Profile with Image

```javascript
// In browser environment
const fileInput = document.getElementById('imageInput');
const imageFile = fileInput.files[0];

const result = await profClient.createProfile({
  name: 'John Doe',
  email: 'john@example.com',
  bio: 'Software developer'
}, imageFile);

console.log(result.profile);
```

#### Update Profile

```javascript
// Update profile data only
const result = await profClient.updateProfile({
  name: 'John Smith', // Updated name
  email: 'john@example.com',
  bio: 'Senior Software Developer', // Updated bio
  location: 'New York, NY' // Updated location
});

// Update profile with new image
const result = await profClient.updateProfile({
  name: 'John Smith',
  email: 'john@example.com'
}, newImageFile);
```

#### Get Profile

```javascript
// Get own profile
const result = await profClient.getProfile();
console.log(result.profile);

// Get another user's profile (if permissions allow)
const result = await profClient.getProfile('other-user-uuid');
console.log(result.profile);
```

#### Delete Profile

```javascript
const result = await profClient.deleteProfile();
console.log('Profile deleted successfully');
```

### Image Operations

#### Get Profile Image

```javascript
// Get image as buffer
const imageBuffer = await profClient.getProfileImage();

// Get image URL for use in HTML
const imageURL = profClient.getProfileImageURL();
```

```html
<!-- Use in HTML -->
<img src="${profClient.getProfileImageURL()}" alt="Profile Image" />

<!-- For another user's image -->
<img src="${profClient.getProfileImageURL('other-user-uuid')}" alt="User Profile" />
```

### Utility Functions

#### Health Check

```javascript
const health = await profClient.healthCheck();
console.log(health); // { status: 'healthy', service: 'prof', version: '0.0.1' }
```

#### MAGIC Spells (Future Feature)

```javascript
// Execute MAGIC spell for cross-service integrations
const result = await profClient.executeSpell('getProfileSummary', {
  includeFields: ['name', 'bio']
});
```

## Profile Data Structure

### Required Fields

- `name` (string, max 100 chars): User's display name
- `email` (string, max 255 chars): User's email address

### Optional Fields

You can include any additional fields in your profile. Common examples:

```javascript
{
  name: 'John Doe',
  email: 'john@example.com',
  
  // Common optional fields
  bio: 'Your bio here',
  location: 'City, State',
  website: 'https://yoursite.com',
  twitter: '@username',
  github: 'username',
  linkedin: 'username',
  phone: '+1-555-0123',
  company: 'Company Name',
  title: 'Job Title',
  birthday: '1990-01-01',
  
  // Custom fields
  customField1: 'Custom value',
  customField2: { nested: 'object' },
  customField3: ['array', 'of', 'values']
}
```

### Limits

- Maximum 20 additional fields
- Each field value limited to 1000 characters (for strings)
- Profile images limited to 5MB
- Images automatically resized to max 1024x1024 pixels

## Error Handling

```javascript
try {
  const result = await profClient.createProfile({
    name: 'John Doe',
    email: 'invalid-email' // This will cause validation error
  });
} catch (error) {
  console.error('Profile creation failed:', error.message);
  
  // Handle specific error types
  if (error.message.includes('Validation failed')) {
    console.log('Check your profile data format');
  } else if (error.message.includes('Profile already exists')) {
    console.log('Use updateProfile instead');
  }
}
```

## Configuration

### Custom Base URL

```javascript
// Set global base URL
prof.baseURL = 'https://prof.yourserver.com';

// Or create client with custom URL
const client = prof.createClient('https://prof.yourserver.com');
```

### Environment Variables

When running in Node.js, you can set:

```bash
PROF_BASE_URL=https://prof.yourserver.com
```

## Browser vs Node.js

This client works in both browser and Node.js environments:

### Browser Features
- Native FormData support for file uploads
- localStorage for key management
- Direct use in HTML img tags with getProfileImageURL()

### Node.js Features
- File system operations
- Buffer handling for images
- Server-side profile management

## Security Notes

- Prof operates independently from allyabase for PII security
- All requests require sessionless cryptographic signatures
- Images are automatically processed and optimized server-side
- Profile data is stored separately from other Planet Nine services
- Email addresses and PII are never shared across services

## Examples

See the `test/` directory for comprehensive usage examples.

## License

MIT