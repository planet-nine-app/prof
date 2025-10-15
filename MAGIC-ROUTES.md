# Prof MAGIC-Routed Endpoints

## Overview

Prof now supports MAGIC-routed versions of all POST, PUT, and DELETE operations. These spells route through Fount (the resolver) for centralized authentication. Prof handles user profile management with PII (Personally Identifiable Information) data for the Planet Nine ecosystem.

## Converted Routes

### 1. Create Profile
**Direct Route**: `POST /user/:uuid/profile`
**MAGIC Spell**: `profUserProfile`
**Cost**: 50 MP

**Components**:
```javascript
{
  uuid: "user-uuid",
  profileData: {
    uuid: "user-uuid", // Should match uuid parameter
    name: "User Name",
    email: "user@example.com",
    bio: "User biography", // Optional
    tags: ["tag1", "tag2"] // Optional - array of profile tags
    // ... other profile fields
  },
  imageData: "base64-encoded-image-data", // Optional
  imageExtension: ".png" // Optional - e.g., '.jpg', '.png', '.webp'
}
```

**Returns**:
```javascript
{
  success: true,
  profile: {
    uuid: "user-uuid",
    name: "User Name",
    email: "user@example.com",
    bio: "User biography",
    tags: ["tag1", "tag2"],
    imageFilename: "generated-uuid.png", // null if no image
    createdAt: "2025-01-14T12:00:00.000Z",
    updatedAt: "2025-01-14T12:00:00.000Z"
  }
}
```

**Validation**:
- Requires uuid and profileData
- Profile must not already exist for this UUID
- Image types: JPEG, JPG, PNG, WebP
- Image size limit: Configured in service config

---

### 2. Update Profile
**Direct Route**: `PUT /user/:uuid/profile`
**MAGIC Spell**: `profUserProfileUpdate`
**Cost**: 50 MP

**Components**:
```javascript
{
  uuid: "user-uuid",
  profileData: {
    name: "Updated Name", // Optional
    email: "newemail@example.com", // Optional
    bio: "Updated biography", // Optional
    tags: ["new-tag1", "new-tag2"] // Optional
    // ... other fields to update
  },
  imageData: "base64-encoded-image-data", // Optional
  imageExtension: ".png" // Optional
}
```

**Returns**:
```javascript
{
  success: true,
  profile: {
    // Full updated profile object
    uuid: "user-uuid",
    name: "Updated Name",
    // ... all profile fields
    createdAt: "2025-01-14T12:00:00.000Z", // Preserved from original
    updatedAt: "2025-01-14T12:30:00.000Z" // Updated timestamp
  }
}
```

**Validation**:
- Requires uuid and profileData
- Profile must exist
- Only provided fields are updated
- Old image is deleted if new image is provided

---

### 3. Delete Profile
**Direct Route**: `DELETE /user/:uuid/profile`
**MAGIC Spell**: `profUserProfileDelete`
**Cost**: 50 MP

**Components**:
```javascript
{
  uuid: "user-uuid"
}
```

**Returns**:
```javascript
{
  success: true
}
```

**Validation**:
- Requires uuid
- Profile must exist
- Deletes profile data and associated image file
- Removes profile from all tag indexes

---

## Implementation Details

### File Changes

1. **`/src/server/node/src/magic/magic.js`** - Added three new spell handlers:
   - `profUserProfile(spell)`
   - `profUserProfileUpdate(spell)`
   - `profUserProfileDelete(spell)`

2. **`/fount/src/server/node/spellbooks/spellbook.js`** - Added spell definitions with destinations and costs

3. **`/test/mocha/magic-spells.js`** - New test file with comprehensive spell tests

4. **`/test/mocha/package.json`** - Added `fount-js` dependency

### Authentication Flow

```
Client → Fount (resolver) → Prof MAGIC handler → Business logic
           ↓
    Verifies signature
    Deducts MP
    Grants experience
    Grants nineum
```

**Before (Direct REST)**:
- Client signs request with multer file upload
- Prof verifies signature directly
- Prof processes profile data and image
- Prof executes business logic

**After (MAGIC Spell)**:
- Client signs spell with base64-encoded image
- Fount verifies signature & deducts MP
- Fount grants experience & nineum to caster
- Fount forwards to Prof
- Prof executes business logic (no auth needed)

### Naming Convention

Route path → Spell name transformation:
```
/user/:uuid/profile (POST)    → profUserProfile
/user/:uuid/profile (PUT)     → profUserProfileUpdate
/user/:uuid/profile (DELETE)  → profUserProfileDelete
```

Pattern: `[service][PathWithoutSlashesAndParams]`

### Profile Management

Prof provides comprehensive profile management for Planet Nine:

**Profile Features**:
- **PII Storage**: Secure storage of personally identifiable information
- **Image Upload**: Profile picture support with automatic processing
- **Tag System**: Organize profiles with custom tags
- **Tag Indexing**: Fast profile lookup by tags
- **Image Management**: Automatic cleanup of old images on update/delete

**Profile Fields**:
- UUID (primary identifier)
- Name
- Email
- Bio
- Tags (array)
- Image filename (reference to stored image)
- Created/Updated timestamps

### Image Upload Handling

Prof uses a different approach than direct HTTP multipart uploads:

**Base64 Encoding**:
- Images are base64-encoded before sending in spell components
- Spell handler decodes base64 back to Buffer
- Buffer passed to profiles module for storage

**Supported Formats**:
- JPEG/JPG
- PNG
- WebP

**Example Encoding**:
```javascript
// Client-side
const imageBuffer = fs.readFileSync('profile-pic.png');
const base64Image = imageBuffer.toString('base64');

// Spell component
{
  imageData: base64Image,
  imageExtension: '.png'
}

// Prof magic handler
const imageBuffer = Buffer.from(imageData, 'base64');
const originalImageName = `image${imageExtension}`;
```

### Tag System

Prof includes an optimized tag indexing system:

**Tag Features**:
- Multiple tags per profile
- Tag-based profile filtering
- Automatic index maintenance
- Index cleanup on profile update/delete

**Tag Workflow**:
1. Profile created with tags → Added to tag indexes
2. Profile updated with new tags → Removed from old, added to new
3. Profile deleted → Removed from all tag indexes

### Dynamic Module Imports

Prof uses dynamic imports to avoid circular dependencies:

```javascript
// In magic.js spell handlers
const profilesModule = await import('../profiles/profiles.js');
const profiles = profilesModule.default;

// Use profiles module
const result = await profiles.createProfile(...);
```

### Error Handling

All spell handlers return consistent error format:
```javascript
{
  success: false,
  error: "Error description"
}
```

**Common Errors**:
- Missing required fields (uuid, profileData)
- Profile already exists (create)
- Profile not found (update, delete)
- Failed to process image
- Failed to save profile
- Internal server error

## Testing

Run MAGIC spell tests:
```bash
cd prof/test/mocha
npm install
npm test magic-spells.js
```

Test coverage:
- ✅ Profile creation via spell
- ✅ Profile creation with image via spell
- ✅ Profile update via spell
- ✅ Profile update with new image via spell
- ✅ Profile deletion via spell
- ✅ Missing uuid validation
- ✅ Missing profileData validation
- ✅ Non-existent profile update (error case)
- ✅ Non-existent profile deletion (error case)
- ✅ Missing fields validation

## Benefits

1. **No Direct Authentication**: Prof handlers don't need to verify signatures
2. **Centralized Auth**: All signature verification in one place (Fount)
3. **Automatic Rewards**: Every spell grants experience + nineum
4. **Gateway Rewards**: Gateway participants get 10% of rewards automatically distributed
5. **Reduced Code**: Prof handlers simplified without auth logic
6. **Consistent Pattern**: Same flow across all services

## Prof's Role in Planet Nine

Prof is the **profile management service** that provides:

### Profile Data Management
- User profile creation and storage
- Profile updates with field flexibility
- Profile deletion with cleanup
- Secure PII handling

### Image Management
- Profile picture upload and storage
- Automatic image processing
- Image cleanup on update/delete
- Multiple image format support

### Tag-Based Organization
- Profile categorization with tags
- Fast tag-based profile lookup
- Automatic tag index maintenance
- Multi-tag support per profile

### PII Security
- Isolated from other allyabase services for security
- Direct profile data storage
- No cross-service PII sharing (by design)
- Independent operation for privacy protection

### Integration Points
- **Fount**: MP deduction and authentication
- **Client Applications**: Profile data for user interfaces
- **Independent Operation**: Prof operates separately from other services for PII protection

## Privacy & Security

### PII Protection

Prof intentionally operates independently from other allyabase services for PII security:

**Design Principles**:
- No automatic cross-service PII sharing
- Direct profile data access only through Prof
- Isolated storage for sensitive information
- Future: Non-PII profile summaries for cross-service use

**Future Integration**:
- `getProfileSummary`: Return non-PII profile data (placeholder)
- `validateProfileAccess`: Validate access permissions (placeholder)

## Next Steps

Progress on MAGIC route conversion:
- ✅ Joan (3 routes complete)
- ✅ Pref (4 routes complete)
- ✅ Aretha (4 routes complete)
- ✅ Continuebee (3 routes complete)
- ✅ BDO (4 routes complete)
- ✅ Julia (8 routes complete)
- ✅ Dolores (8 routes complete)
- ✅ Sanora (6 routes complete)
- ✅ Addie (9 routes complete)
- ✅ Covenant (5 routes complete)
- ✅ Prof (3 routes complete)
- ⏳ Fount (internal routes)
- ⏳ Minnie (SMTP only, no HTTP routes)

## Last Updated
January 14, 2025
