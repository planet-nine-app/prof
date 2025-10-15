# Prof - Planet Nine Profile Management Service

## Overview

Prof is a Planet Nine allyabase microservice that manages user profiles with PII data and image storage using sessionless authentication.

**Location**: `/prof/`
**Port**: 3012 (default)

## Core Features

### 👤 **Profile Management**
- **User Profiles**: Create and manage detailed user profiles
- **Image Storage**: Base64 image encoding for profile pictures
- **PII Security**: Isolated storage for personally identifiable information
- **Sessionless Auth**: All operations use cryptographic signatures

## API Endpoints

### Profile Operations
- `POST /profile` - Create user profile
- `PUT /profile/:uuid` - Update profile
- `GET /profile/:uuid` - Retrieve profile
- `DELETE /profile/:uuid` - Delete profile

### MAGIC Protocol
- `POST /magic/spell/:spellName` - Execute MAGIC spells for profile operations

### Health & Status
- `GET /health` - Service health check

## MAGIC Route Conversion (October 2025)

All Prof REST endpoints have been converted to MAGIC protocol spells:

### Converted Spells (3 total)
1. **profUserProfile** - Create user profile (with optional image)
2. **profUserProfileUpdate** - Update profile (with optional image)
3. **profUserProfileDelete** - Delete profile

**Testing**: Comprehensive MAGIC spell tests available in `/test/mocha/magic-spells.js` (10 tests covering success and error cases)

**Documentation**: See `/MAGIC-ROUTES.md` for complete spell specifications and migration guide

## Implementation Details

**Location**: `/src/server/node/src/magic/magic.js`

All profile operations maintain the same functionality as the original REST endpoints while benefiting from centralized Fount authentication and MAGIC protocol features like experience granting and gateway rewards.

**Special Features**:
- Image data transmitted via base64 encoding in spell components
- Supports profile creation/update with or without images
- Dynamic module imports to avoid circular dependencies

## Last Updated
October 14, 2025 - Completed full MAGIC protocol conversion. All 3 routes now accessible via MAGIC spells with centralized Fount authentication and base64 image support.
