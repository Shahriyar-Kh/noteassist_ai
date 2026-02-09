# Google Integration Documentation
## Google Authentication & Google Drive Connection

---

## Table of Contents
1. [Overview](#overview)
2. [Google OAuth 2.0 Setup](#google-oauth-20-setup)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend Implementation](#backend-implementation)
5. [API Endpoints](#api-endpoints)
6. [Google Drive Integration](#google-drive-integration)
7. [Configuration & Environment](#configuration--environment)
8. [Error Handling](#error-handling)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

NoteAssist AI integrates with Google services for:
- **Google OAuth 2.0 Authentication**: One-click login/registration
- **Google Drive Integration**: Store and sync notes to Google Drive
- **Token Management**: Secure storage and refresh of OAuth tokens

### Key Features
✅ Seamless Google Sign-In  
✅ Automatic Google Drive folder creation  
✅ PDF export to Google Drive  
✅ Note synchronization  
✅ Secure token storage  

---

## Google OAuth 2.0 Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable these APIs:
   - Google+ API
   - Google Drive API
   - Google Identity Services

### Step 2: Create OAuth 2.0 Credentials

1. Navigate to **Credentials** section
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Add Authorized origins:
   ```
   http://localhost:5173
   http://localhost:3000
   https://yourdomain.com
   ```
5. Add Authorized redirect URIs:
   ```
   http://localhost:5173/
   http://localhost:3000/
   https://yourdomain.com/
   http://localhost:8000/api/auth/google_callback/
   https://yourdomain.com/api/auth/google_callback/
   ```

### Step 3: Download Credentials

- Download the OAuth 2.0 Client ID (JSON)
- Extract and save:
  - **Client ID**: Used in frontend
  - **Client Secret**: Used in backend (keep secure!)

---

## Frontend Implementation

### Google Sign-In Button Setup

#### Location: `src/pages/LoginPage.jsx`

```jsx
useEffect(() => {
  const initGoogleOAuth = () => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
      
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        auto_select: false,
        context: 'signin',
      });
      
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: 'continue_with',
        }
      );
    }
  };
  
  // Load Google script
  if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleOAuth();
    document.body.appendChild(script);
  }
}, []);
```

### Google Response Handler

```jsx
const handleGoogleResponse = async (response) => {
  try {
    setLoading(true);
    
    if (!response.credential) {
      throw new Error('No credential received from Google');
    }
    
    const res = await fetch(`${API_BASE_URL}/api/auth/google_auth/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential: response.credential }),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.detail || 'Authentication failed');
    }
    
    // Store tokens
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    
    // Redirect to dashboard
    navigate('/dashboard');
    
  } catch (error) {
    console.error('Google Auth Error:', error);
    toast.error(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Google Drive Upload Component

#### Location: `src/components/notes/ExportButtons.jsx`

```jsx
const handleUploadToGoogleDrive = async () => {
  try {
    setUploading(true);
    
    // Check if connected
    const checkRes = await noteService.checkGoogleDriveStatus();
    
    if (!checkRes.connected) {
      // Redirect to connection setup
      navigate('/notes?setup-google-drive=true');
      return;
    }
    
    // Upload file
    const response = await noteService.uploadToDrive(noteId, {
      title: note.title,
      content: exportedContent,
      format: 'pdf'
    });
    
    toast.success('Uploaded to Google Drive');
  } catch (error) {
    toast.error('Upload failed: ' + error.message);
  } finally {
    setUploading(false);
  }
};
```

### Environment Variables (Frontend)

Create `.env` file in `NoteAssist_AI_frontend/`:

```env
VITE_GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:8000
```

---

## Backend Implementation

### Google OAuth Configuration

#### Location: `NoteAssist_AI/settings.py`

```python
# Google OAuth Settings
GOOGLE_OAUTH2_CLIENT_ID = os.getenv('GOOGLE_OAUTH2_CLIENT_ID')
GOOGLE_OAUTH2_CLIENT_SECRET = os.getenv('GOOGLE_OAUTH2_CLIENT_SECRET')

# Google Drive Settings
GOOGLE_DRIVE_SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive.file'
]
```

### Google Authentication View

#### Location: `accounts/views.py`

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from google.auth.transport import requests
from google.oauth2 import id_token
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """
    Authenticate user via Google OAuth 2.0 ID token
    """
    try:
        credential = request.data.get('credential')
        
        if not credential:
            return Response(
                {'error': 'No credential provided'},
                status=400
            )
        
        # Verify token
        idinfo = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            settings.GOOGLE_OAUTH2_CLIENT_ID
        )
        
        email = idinfo.get('email')
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': first_name,
                'last_name': last_name,
            }
        )
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.get_full_name(),
            }
        })
        
    except Exception as e:
        logger.error(f"Google auth error: {str(e)}")
        return Response(
            {'error': 'Authentication failed'},
            status=400
        )
```

### Google Drive Service

#### Location: `notes/google_drive_service.py`

```python
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
import pickle

class GoogleDriveService:
    """Manage Google Drive integration"""
    
    SCOPES = [
        'https://www.googleapis.com/auth/drive.file'
    ]
    
    def __init__(self, user):
        self.user = user
        self.service = None
        self._authenticate()
    
    def _authenticate(self):
        """Load or refresh user's Google credentials"""
        creds = self._load_credentials()
        
        if creds and creds.expired:
            creds.refresh(Request())
            self._save_credentials(creds)
        
        self.service = build('drive', 'v3', credentials=creds)
    
    def get_auth_url(self):
        """Generate Google OAuth consent URL"""
        flow = Flow.from_client_secrets_file(
            'client_secret.json',
            scopes=self.SCOPES
        )
        flow.redirect_uri = 'http://localhost:8000/api/auth/google_callback/'
        
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        return auth_url, state
    
    def create_folder(self, folder_name='NoteAssist AI Notes'):
        """Create or get NoteAssist AI folder in Google Drive"""
        try:
            # Search for existing folder
            results = self.service.files().list(
                q=f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder'",
                spaces='drive',
                fields='files(id, name)',
                pageSize=1
            ).execute()
            
            files = results.get('files', [])
            
            if files:
                return files[0]['id']
            
            # Create new folder
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            folder = self.service.files().create(
                body=file_metadata,
                fields='id'
            ).execute()
            
            return folder.get('id')
            
        except Exception as e:
            logger.error(f"Error creating folder: {str(e)}")
            return None
    
    def upload_file(self, file_content, filename, folder_id=None):
        """Upload file to Google Drive"""
        try:
            file_metadata = {
                'name': filename,
                'mimeType': 'application/pdf'
            }
            
            if folder_id:
                file_metadata['parents'] = [folder_id]
            
            media = MediaIoBaseUpload(
                BytesIO(file_content),
                mimetype='application/pdf',
                resumable=True
            )
            
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, webViewLink'
            ).execute()
            
            return {
                'file_id': file.get('id'),
                'link': file.get('webViewLink')
            }
            
        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            return None
    
    def list_files(self):
        """List files in NoteAssist AI folder"""
        try:
            results = self.service.files().list(
                q="name='NoteAssist AI Notes' and mimeType='application/vnd.google-apps.folder'",
                spaces='drive',
                fields='files(id, name, createdTime)',
                pageSize=10
            ).execute()
            
            return results.get('files', [])
            
        except Exception as e:
            logger.error(f"Error listing files: {str(e)}")
            return []
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Google OAuth Authentication
**POST** `/api/auth/google_auth/`

Request:
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}
```

Response:
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### 2. Google OAuth Callback
**GET** `/api/auth/google_callback/`

Query Parameters:
- `code`: Authorization code from Google
- `state`: State parameter for CSRF protection

---

### Google Drive Endpoints

#### 1. Get Google Drive Status
**GET** `/api/notes/google_drive_status/`

Response:
```json
{
  "connected": true,
  "folder_id": "1234567890",
  "email": "user@gmail.com"
}
```

#### 2. Connect Google Drive
**POST** `/api/notes/connect_google_drive/`

Request:
```json
{
  "code": "4/0AY-...",
  "state": "state_token_123"
}
```

Response:
```json
{
  "success": true,
  "message": "Google Drive connected successfully"
}
```

#### 3. Upload to Google Drive
**POST** `/api/notes/{note_id}/upload_to_drive/`

Request:
```json
{
  "format": "pdf"
}
```

Response:
```json
{
  "success": true,
  "file_id": "1KkdB2z_X...",
  "link": "https://drive.google.com/file/d/1KkdB2z_X/view"
}
```

#### 4. Disconnect Google Drive
**POST** `/api/notes/disconnect_google_drive/`

Response:
```json
{
  "success": true,
  "message": "Google Drive disconnected"
}
```

---

## Google Drive Integration

### Feature 1: Auto-Folder Creation

When a user first connects Google Drive, a folder named "NoteAssist AI Notes" is automatically created in their Google Drive.

```python
# In google_drive_service.py
folder_id = google_drive.create_folder('NoteAssist AI Notes')
```

### Feature 2: PDF Export to Drive

Users can export their notes as PDF directly to Google Drive.

**Flow:**
1. User clicks "Export to Google Drive" button
2. System generates PDF from note content
3. PDF is uploaded to NoteAssist AI Notes folder
4. Share link returned to user

### Feature 3: Sync Notes

Notes can be synced with Google Drive for backup.

```python
def sync_note_to_drive(note, google_drive):
    """Sync note to Google Drive"""
    pdf_content = generate_pdf(note)
    
    folder_id = google_drive.get_folder_id()
    result = google_drive.upload_file(
        pdf_content,
        f"{note.title}.pdf",
        folder_id
    )
    
    return result
```

---

## Configuration & Environment

### Backend Environment Variables

Create `.env` file in `NoteAssist_AI_Backend/`:

```env
# Google OAuth
GOOGLE_OAUTH2_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH2_CLIENT_SECRET=your-client-secret

# Google Drive
GOOGLE_DRIVE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret

# API Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

### Frontend Environment Variables

```env
VITE_GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_DRIVE_ENABLED=true
```

### Django Settings

```python
# settings.py

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

GOOGLE_OAUTH2_CLIENT_ID = os.getenv('GOOGLE_OAUTH2_CLIENT_ID')
GOOGLE_OAUTH2_CLIENT_SECRET = os.getenv('GOOGLE_OAUTH2_CLIENT_SECRET')

# CORS Configuration for Google OAuth
CORS_ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
```

---

## Error Handling

### Common Errors

#### 1. Invalid Credential
```
Error: "No credential received from Google"
```
**Solution**: Ensure Google Sign-In button is rendered and user clicks it.

#### 2. Token Expired
```
Error: "access_denied"
```
**Solution**: User needs to re-authenticate.

#### 3. Google Drive Not Connected
```
Error: "Google Drive is not connected"
```
**Solution**: User needs to authorize Google Drive access.

#### 4. CORS Error
```
Error: "Access to XMLHttpRequest blocked by CORS policy"
```
**Solution**: Add your domain to CORS_ALLOWED_ORIGINS in Django settings.

### Error Handling in Frontend

```jsx
try {
  const response = await fetch('/api/auth/google_auth/', {
    method: 'POST',
    body: JSON.stringify({ credential })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    if (data.error_type === 'google_auth_failed') {
      throw new Error('Google authentication failed');
    } else if (data.error_type === 'account_disabled') {
      throw new Error('Account disabled');
    } else {
      throw new Error(data.detail || 'Unknown error');
    }
  }
  
  return data;
} catch (error) {
  console.error('Auth error:', error);
  toast.error(error.message);
}
```

---

## Security Considerations

### 1. Token Storage
- **Frontend**: Use localStorage (consider using secure httpOnly cookies)
- **Backend**: Store refresh tokens securely with encryption

### 2. Client Secret Protection
- Never expose `GOOGLE_OAUTH2_CLIENT_SECRET` in frontend
- Store only in backend environment variables
- Use `.env` file with proper permissions

### 3. CSRF Protection
- Use state parameter in Google OAuth flow
- Validate state before processing callback

### 4. Scopes Limitation
- Request only necessary scopes
- Current scopes limited to: `drive.file` (not `drive` which is full access)

### 5. Token Expiration
- Implement token refresh mechanism
- Handle expired tokens gracefully

### 6. SSL/HTTPS
- Always use HTTPS in production
- Update Google Console authorized origins to HTTPS

---

## Troubleshooting

### Issue 1: Google Sign-In Button Not Showing
**Symptoms**: Button div is empty
**Solution**:
1. Check if Google Client ID is set in `.env`
2. Verify Google script is loaded
3. Check browser console for errors

```javascript
// Debug
console.log(window.google); // Should exist
console.log(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID); // Should have value
```

### Issue 2: "redirect_uri_mismatch" Error
**Symptoms**: Error when redirecting back from Google
**Solution**:
1. Go to Google Cloud Console
2. Check Authorized redirect URIs
3. Ensure exact match with your callback URL
4. Include http/https and trailing slash if needed

### Issue 3: Google Drive Upload Fails
**Symptoms**: Upload button shows error
**Solution**:
1. Check if user has authorized Google Drive
2. Verify `drive.file` scope is enabled
3. Check file size (Google Drive has limits)
4. Ensure folder exists in Google Drive

### Issue 4: Token Refresh Fails
**Symptoms**: User logged out after token expires
**Solution**:
1. Implement automatic token refresh
2. Check if refresh token is stored
3. Verify token hasn't been revoked

```python
# Backend token refresh
if creds.expired and creds.refresh_token:
    creds.refresh(Request())
    save_credentials(user, creds)
```

### Issue 5: CORS Errors
**Symptoms**: "Access-Control-Allow-Origin" errors
**Solution**:
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'https://yourdomain.com'
]
```

---

## Testing

### Manual Testing Checklist

- [ ] Google Sign-In button renders
- [ ] Click sign-in opens Google auth window
- [ ] Successful authentication redirects to dashboard
- [ ] User data is stored correctly
- [ ] Token is saved in localStorage
- [ ] Google Drive folder is created
- [ ] PDF export to Google Drive works
- [ ] Disconnect Google Drive removes permissions
- [ ] Token refresh works after expiration
- [ ] Error messages display correctly

### API Testing

```bash
# Test Google Auth endpoint
curl -X POST http://localhost:8000/api/auth/google_auth/ \
  -H "Content-Type: application/json" \
  -d '{"credential": "YOUR_CREDENTIAL_TOKEN"}'

# Test Google Drive status
curl -X GET http://localhost:8000/api/notes/google_drive_status/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In Library](https://developers.google.com/identity/gsi/web)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Google Identity Services](https://developers.google.com/identity/gsi)

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review error logs
3. Check Google Cloud Console for quota limits
4. Contact support team

**Last Updated**: February 6, 2026
