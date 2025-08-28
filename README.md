# Prof - Planet Nine Profile Service

Prof is a Planet Nine miniservice for managing user profiles with personally identifiable information (PII). Unlike other Planet Nine services that operate within the allyabase ecosystem, Prof operates independently to maintain strict separation of PII data for enhanced privacy and security.

## Overview

Prof provides CRUD operations for user profiles including:
- **Required fields**: Name, email
- **Optional fields**: Any additional arbitrary fields
- **Image support**: Profile image upload with automatic processing and optimization
- **PII isolation**: Operates separately from allyabase for privacy protection
- **Sessionless authentication**: Uses cryptographic signatures instead of passwords

## Features

### Core Functionality
- ✅ **Create profiles** with name, email, and arbitrary additional fields
- ✅ **Update profiles** with partial or complete data changes  
- ✅ **Retrieve profiles** with full data access
- ✅ **Delete profiles** with complete cleanup
- ✅ **Image uploads** with automatic resize and optimization
- ✅ **Validation** for required fields and data limits
- ✅ **Sessionless auth** with cryptographic signatures

### Technical Features
- ✅ **Node.js server** with Express and modern ES modules
- ✅ **File storage** with organized directory structure
- ✅ **Image processing** using Sharp (resize, optimize, format conversion)
- ✅ **Multi-client support** with JavaScript and Rust SDKs
- ✅ **Comprehensive tests** with Mocha and Chai
- ✅ **Error handling** with detailed validation feedback
- ✅ **CORS support** for web client integration

### Privacy & Security
- ✅ **PII separation** - operates independently from allyabase
- ✅ **Image optimization** - automatic resize and compression
- ✅ **Input validation** - prevents malicious data and oversized uploads
- ✅ **Timestamp validation** - prevents replay attacks
- ✅ **Signature verification** - cryptographic authentication

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone and install**:
   ```bash
   cd prof/src/server/node
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   # or
   node prof.js
   ```

   The server will start on port 3008 by default.

3. **Verify installation**:
   ```bash
   curl http://localhost:3008/health
   ```

### Basic Usage

#### JavaScript Client

```bash
cd prof/src/client/javascript
npm install
```

```javascript
import prof from 'prof-js';
import sessionless from 'sessionless-node';

// Create client and set up authentication
const profClient = prof.createClient('http://localhost:3008');
const keys = sessionless.generateKeys();
profClient.setKeys(keys);

// Create a profile
const result = await profClient.createProfile({
  name: 'John Doe',
  email: 'john@example.com',
  bio: 'Software developer',
  location: 'San Francisco, CA'
});

console.log('Profile created:', result.profile);
```

#### Rust Client

```toml
[dependencies]
prof-rs = { path = "prof/src/client/rust/prof-rs" }
sessionless = { path = "sessionless/rust/sessionless" }
tokio = { version = "1.0", features = ["full"] }
```

```rust
use prof_rs::{ProfClient, ProfileBuilder};
use sessionless::Sessionless;
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create client and set up authentication
    let sessionless = Sessionless::new()?;
    let client = ProfClient::new("http://localhost:3008".to_string())
        .with_sessionless(sessionless);

    // Create a profile using builder pattern
    let profile_data = ProfileBuilder::new()
        .name("Jane Doe")
        .email("jane@example.com")
        .field("bio", "Rust developer")
        .field("location", "Seattle, WA")
        .build();

    let profile = client.create_profile(profile_data, None).await?;
    println!("Profile created: {:?}", profile);
    
    Ok(())
}
```

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/user/:uuid/profile` | Create new profile |
| `PUT` | `/user/:uuid/profile` | Update existing profile |
| `GET` | `/user/:uuid/profile` | Get profile data |
| `DELETE` | `/user/:uuid/profile` | Delete profile |
| `GET` | `/user/:uuid/profile/image` | Get profile image |
| `GET` | `/health` | Health check |
| `POST` | `/magic/spell/:spellName` | Execute MAGIC spell |

### Profile Data Structure

```json
{
  "uuid": "user-uuid",
  "name": "Required string (max 100 chars)",
  "email": "Required email format (max 255 chars)",
  "imageFilename": "Optional filename.jpg",
  "createdAt": "2025-01-29T10:30:00.000Z",
  "updatedAt": "2025-01-29T10:30:00.000Z",
  "customField1": "Any additional field",
  "customField2": { "nested": "objects allowed" },
  "customField3": ["arrays", "also", "supported"]
}
```

### Validation Rules

- **Name**: Required, 1-100 characters
- **Email**: Required, valid email format, max 255 characters  
- **Additional fields**: Max 20 fields, max 1000 characters per string field
- **Images**: Max 5MB, JPEG/PNG/WebP, auto-resized to 1024x1024
- **Request timestamp**: Must be within configured time window (default: 5 minutes)

## Development

### Project Structure

```
prof/
├── src/
│   ├── server/node/           # Node.js server
│   │   ├── prof.js           # Main server file
│   │   ├── config/           # Configuration files
│   │   └── src/
│   │       ├── profiles/     # Profile business logic
│   │       ├── persistence/  # Database layer
│   │       └── magic/        # MAGIC spell handlers
│   └── client/
│       ├── javascript/       # JavaScript SDK
│       └── rust/prof-rs/     # Rust SDK
├── test/mocha/               # Test suites
├── LICENSE                   # MIT license
└── README.md                # This file
```

### Running Tests

```bash
# Install test dependencies
cd prof/test/mocha
npm install

# Run all tests (requires server running on localhost:3008)
npm test

# Run specific test suites
npm run test-server    # Server tests
npm run test-client    # Client tests
```

### Configuration

Edit `src/server/node/config/local.js`:

```javascript
export default {
  port: 3008,
  allowedTimeDifference: 300000, // 5 minutes
  maxImageSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  imageResolution: { maxWidth: 1024, maxHeight: 1024 },
  profileLimits: {
    maxNameLength: 100,
    maxEmailLength: 255,
    maxFieldLength: 1000,
    maxFields: 20
  }
};
```

### Adding Custom Fields

Prof supports arbitrary additional fields beyond name and email:

```javascript
// JavaScript example
const profile = await profClient.createProfile({
  name: 'John Doe',
  email: 'john@example.com',
  
  // Standard optional fields
  bio: 'Software developer and coffee enthusiast',
  location: 'San Francisco, CA',
  website: 'https://johndoe.dev',
  twitter: '@johndoe',
  github: 'johndoe',
  
  // Custom business fields
  company: 'Acme Corp',
  title: 'Senior Developer',
  department: 'Engineering',
  
  // Complex data types
  skills: ['JavaScript', 'Node.js', 'React'],
  preferences: {
    theme: 'dark',
    notifications: true,
    language: 'en'
  },
  
  // Any other fields your application needs
  customField: 'custom value'
});
```

## Integration

### Planet Nine Ecosystem

Prof operates **independently** from the main allyabase ecosystem by design:

- **Separate from allyabase**: PII data is not shared with other services
- **No continuebee integration**: Uses direct sessionless signature validation
- **Independent storage**: Profile data stored locally, not in BDO
- **Privacy first**: Email addresses and personal data stay within Prof

### Cross-Service Integration

Future MAGIC spells may provide limited cross-service functionality:

```javascript
// Future: Get non-PII profile summary for other services
const summary = await profClient.executeSpell('getProfileSummary', {
  includeFields: ['name'], // Only non-sensitive fields
  excludePII: true
});
```

### Web Integration

Prof works seamlessly with web applications:

```html
<!-- Display profile image -->
<img src="http://localhost:3008/user/USER_UUID/profile/image?timestamp=...&signature=..." 
     alt="Profile Image" />

<!-- Or use client SDK -->
<script type="module">
  import prof from './path/to/prof.js';
  const client = prof.createClient();
  document.getElementById('avatar').src = client.getProfileImageURL();
</script>
```

## Security Considerations

### PII Protection
- Prof stores sensitive personal information separately from other Planet Nine services
- Email addresses, names, and custom fields are never shared across services
- Image files are processed and optimized server-side to remove metadata

### Authentication
- Uses sessionless cryptographic signatures instead of passwords
- All requests must include valid timestamp and signature
- Signatures are verified against the requesting user's UUID

### Input Validation
- All profile data is validated server-side
- File uploads are restricted by type and size
- Images are automatically processed and sanitized
- Request timestamps prevent replay attacks

### Data Storage
- Profile data stored as JSON files (easily replaceable with database)
- Images stored separately with generated filenames
- No sensitive data logged or exposed in error messages

## Deployment

### Production Setup

1. **Environment variables**:
   ```bash
   export NODE_ENV=production
   export PROF_PORT=3008
   export PROF_DATA_PATH=/var/prof/data
   export PROF_MAX_IMAGE_SIZE=5242880
   ```

2. **Reverse proxy** (nginx example):
   ```nginx
   location /prof/ {
       proxy_pass http://localhost:3008/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       client_max_body_size 10M;
   }
   ```

3. **Process management**:
   ```bash
   # Using PM2
   pm2 start prof.js --name prof-service
   
   # Using systemd
   sudo systemctl enable prof.service
   sudo systemctl start prof.service
   ```

### Scaling Considerations
- Prof uses file-based storage for simplicity
- For high-volume deployments, replace file storage with database
- Images can be moved to CDN or object storage
- Multiple Prof instances can share database but need separate image storage

## Troubleshooting

### Common Issues

**Server won't start**:
```bash
# Check port availability
lsof -i :3008

# Check file permissions
ls -la data/profiles/
```

**Image upload fails**:
```bash
# Check file size limits
curl -F "image=@large-image.jpg" http://localhost:3008/user/test/profile

# Check image type
file image.jpg  # Should show valid image format
```

**Authentication errors**:
```javascript
// Verify timestamp is recent
const timestamp = Date.now();
console.log('Current timestamp:', timestamp);

// Check signature generation
const signature = sessionless.sign(privateKey, uuid, timestamp);
console.log('Generated signature:', signature);
```

**Tests failing**:
```bash
# Ensure server is running
curl http://localhost:3008/health

# Check test dependencies
cd test/mocha && npm install

# Run tests with verbose output
npm test -- --reporter spec
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=prof:* node prof.js
```

### Health Monitoring

Monitor Prof service health:

```bash
# Basic health check
curl http://localhost:3008/health

# Check specific functionality
curl -X POST http://localhost:3007/magic/spell/getProfileSummary \
  -H "Content-Type: application/json" \
  -d '{"timestamp": '$(date +%s000)'}'
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit pull request

## Support

- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: See client SDK README files for detailed usage
- **Examples**: Check the `test/` directory for comprehensive examples

---

Prof is part of the [Planet Nine](https://planet-nine.org) ecosystem - building decentralized, privacy-focused alternatives to traditional web services.