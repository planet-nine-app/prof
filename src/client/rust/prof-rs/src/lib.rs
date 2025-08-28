use reqwest::{Client, multipart};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;
use uuid::Uuid;

pub use sessionless::{Sessionless, hex::IntoHex};

#[derive(Error, Debug)]
pub enum ProfError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Prof service error: {0}")]
    Service(String),
    #[error("Authentication failed: {0}")]
    Auth(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Validation failed: {errors:?}")]
    Validation { errors: Vec<String> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub uuid: String,
    pub name: String,
    pub email: String,
    #[serde(rename = "imageFilename")]
    pub image_filename: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(flatten)]
    pub additional_fields: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileResponse {
    pub success: bool,
    pub profile: Option<Profile>,
    pub error: Option<String>,
    pub details: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MagicResponse {
    pub success: bool,
    pub error: Option<String>,
    #[serde(flatten)]
    pub data: HashMap<String, serde_json::Value>,
}

pub struct ProfClient {
    base_url: String,
    client: Client,
    sessionless: Option<Sessionless>,
}

impl ProfClient {
    pub fn new(base_url: String) -> Self {
        let base_url = if base_url.ends_with('/') {
            base_url.trim_end_matches('/').to_string()
        } else {
            base_url
        };

        Self {
            base_url,
            client: Client::new(),
            sessionless: None,
        }
    }

    pub fn with_sessionless(mut self, sessionless: Sessionless) -> Self {
        self.sessionless = Some(sessionless);
        self
    }

    pub fn set_sessionless(&mut self, sessionless: Sessionless) {
        self.sessionless = Some(sessionless);
    }

    fn get_auth_params(&self) -> Result<HashMap<String, String>, ProfError> {
        let sessionless = self.sessionless.as_ref()
            .ok_or_else(|| ProfError::Auth("Sessionless not configured".to_string()))?;

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
            .to_string();

        let hash = Uuid::new_v4().to_string();
        let uuid = sessionless.public_key().to_hex();
        
        // Create message to sign from timestamp
        let signature = sessionless.sign(&timestamp);

        let mut params = HashMap::new();
        params.insert("uuid".to_string(), uuid);
        params.insert("timestamp".to_string(), timestamp);
        params.insert("hash".to_string(), hash);
        params.insert("signature".to_string(), signature.to_hex());

        Ok(params)
    }

    pub async fn create_profile(
        &self,
        profile_data: HashMap<String, serde_json::Value>,
        image_data: Option<(Vec<u8>, String)>, // (bytes, filename)
    ) -> Result<Profile, ProfError> {
        let auth = self.get_auth_params()?;
        let uuid = auth.get("uuid").unwrap();

        let url = format!("{}/user/{}/profile", self.base_url, uuid);

        let mut form = multipart::Form::new();

        // Add profile data
        form = form.text("profileData", serde_json::to_string(&profile_data)?);

        // Add auth parameters
        for (key, value) in auth {
            form = form.text(key, value);
        }

        // Add image if provided
        if let Some((image_bytes, filename)) = image_data {
            let part = multipart::Part::bytes(image_bytes)
                .file_name(filename.clone())
                .mime_str(&self.guess_mime_type(&filename))?;
            form = form.part("image", part);
        }

        let response = self.client
            .post(&url)
            .multipart(form)
            .send()
            .await?;

        let status = response.status();
        let response_text = response.text().await?;
        
        // Try to parse as ProfileResponse first (successful response)
        let response_data: ProfileResponse = if let Ok(parsed) = serde_json::from_str(&response_text) {
            parsed
        } else {
            // If that fails, try to parse as a simple error response
            if let Ok(error_obj) = serde_json::from_str::<serde_json::Value>(&response_text) {
                if let Some(error_msg) = error_obj.get("error").and_then(|e| e.as_str()) {
                    ProfileResponse {
                        success: false,
                        profile: None,
                        error: Some(error_msg.to_string()),
                        details: error_obj.get("details")
                            .and_then(|d| d.as_array())
                            .map(|arr| arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                .collect()),
                    }
                } else {
                    return Err(ProfError::Service(format!("Invalid response format: {}", response_text)));
                }
            } else {
                return Err(ProfError::Service(format!("Could not parse response: {}", response_text)));
            }
        };

        if !response_data.success {
            return match status.as_u16() {
                400 => {
                    if let Some(details) = response_data.details {
                        Err(ProfError::Validation { errors: details })
                    } else {
                        Err(ProfError::Service(response_data.error.unwrap_or_else(|| "Validation failed".to_string())))
                    }
                },
                404 => Err(ProfError::NotFound(response_data.error.unwrap_or_else(|| "Not found".to_string()))),
                _ => Err(ProfError::Service(response_data.error.unwrap_or_else(|| "Unknown error".to_string()))),
            };
        }

        response_data.profile.ok_or_else(|| ProfError::Service("No profile in response".to_string()))
    }

    pub async fn update_profile(
        &self,
        profile_data: HashMap<String, serde_json::Value>,
        image_data: Option<(Vec<u8>, String)>,
    ) -> Result<Profile, ProfError> {
        let auth = self.get_auth_params()?;
        let uuid = auth.get("uuid").unwrap();

        let url = format!("{}/user/{}/profile", self.base_url, uuid);

        let mut form = multipart::Form::new();

        // Add profile data
        form = form.text("profileData", serde_json::to_string(&profile_data)?);

        // Add auth parameters
        for (key, value) in auth {
            form = form.text(key, value);
        }

        // Add image if provided
        if let Some((image_bytes, filename)) = image_data {
            let part = multipart::Part::bytes(image_bytes)
                .file_name(filename.clone())
                .mime_str(&self.guess_mime_type(&filename))?;
            form = form.part("image", part);
        }

        let response = self.client
            .put(&url)
            .multipart(form)
            .send()
            .await?;

        let status = response.status();
        let response_text = response.text().await?;
        
        // Try to parse as ProfileResponse first (successful response)
        let response_data: ProfileResponse = if let Ok(parsed) = serde_json::from_str(&response_text) {
            parsed
        } else {
            // If that fails, try to parse as a simple error response
            if let Ok(error_obj) = serde_json::from_str::<serde_json::Value>(&response_text) {
                if let Some(error_msg) = error_obj.get("error").and_then(|e| e.as_str()) {
                    ProfileResponse {
                        success: false,
                        profile: None,
                        error: Some(error_msg.to_string()),
                        details: error_obj.get("details")
                            .and_then(|d| d.as_array())
                            .map(|arr| arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                .collect()),
                    }
                } else {
                    return Err(ProfError::Service(format!("Invalid response format: {}", response_text)));
                }
            } else {
                return Err(ProfError::Service(format!("Could not parse response: {}", response_text)));
            }
        };

        if !response_data.success {
            return match status.as_u16() {
                400 => {
                    if let Some(details) = response_data.details {
                        Err(ProfError::Validation { errors: details })
                    } else {
                        Err(ProfError::Service(response_data.error.unwrap_or_else(|| "Validation failed".to_string())))
                    }
                },
                404 => Err(ProfError::NotFound(response_data.error.unwrap_or_else(|| "Profile not found".to_string()))),
                _ => Err(ProfError::Service(response_data.error.unwrap_or_else(|| "Unknown error".to_string()))),
            };
        }

        response_data.profile.ok_or_else(|| ProfError::Service("No profile in response".to_string()))
    }

    pub async fn get_profile(&self, uuid: Option<&str>) -> Result<Profile, ProfError> {
        let auth = self.get_auth_params()?;
        let target_uuid = uuid.unwrap_or_else(|| auth.get("uuid").unwrap());

        let mut url = format!("{}/user/{}/profile", self.base_url, target_uuid);
        
        // Add query parameters
        let query_params: Vec<String> = auth.iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        
        if !query_params.is_empty() {
            url.push('?');
            url.push_str(&query_params.join("&"));
        }

        let response = self.client
            .get(&url)
            .send()
            .await?;

        let status = response.status();
        let response_text = response.text().await?;
        
        // Try to parse as ProfileResponse first (successful response)
        let response_data: ProfileResponse = if let Ok(parsed) = serde_json::from_str(&response_text) {
            parsed
        } else {
            // If that fails, try to parse as a simple error response
            if let Ok(error_obj) = serde_json::from_str::<serde_json::Value>(&response_text) {
                if let Some(error_msg) = error_obj.get("error").and_then(|e| e.as_str()) {
                    ProfileResponse {
                        success: false,
                        profile: None,
                        error: Some(error_msg.to_string()),
                        details: error_obj.get("details")
                            .and_then(|d| d.as_array())
                            .map(|arr| arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                .collect()),
                    }
                } else {
                    return Err(ProfError::Service(format!("Invalid response format: {}", response_text)));
                }
            } else {
                return Err(ProfError::Service(format!("Could not parse response: {}", response_text)));
            }
        };

        if !response_data.success {
            return match status.as_u16() {
                404 => Err(ProfError::NotFound(response_data.error.unwrap_or_else(|| "Profile not found".to_string()))),
                _ => Err(ProfError::Service(response_data.error.unwrap_or_else(|| "Unknown error".to_string()))),
            };
        }

        response_data.profile.ok_or_else(|| ProfError::Service("No profile in response".to_string()))
    }

    pub async fn delete_profile(&self) -> Result<(), ProfError> {
        let auth = self.get_auth_params()?;
        let uuid = auth.get("uuid").unwrap();

        let url = format!("{}/user/{}/profile", self.base_url, uuid);

        let response = self.client
            .delete(&url)
            .json(&auth)
            .send()
            .await?;

        let status = response.status();
        
        if !status.is_success() {
            let error_response: ProfileResponse = response.json().await?;
            return Err(ProfError::Service(error_response.error.unwrap_or_else(|| "Delete failed".to_string())));
        }

        Ok(())
    }

    pub async fn get_profile_image(&self, uuid: Option<&str>) -> Result<Vec<u8>, ProfError> {
        let auth = self.get_auth_params()?;
        let target_uuid = uuid.unwrap_or_else(|| auth.get("uuid").unwrap());

        let mut url = format!("{}/user/{}/profile/image", self.base_url, target_uuid);
        
        // Add query parameters
        let query_params: Vec<String> = auth.iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        
        if !query_params.is_empty() {
            url.push('?');
            url.push_str(&query_params.join("&"));
        }

        let response = self.client
            .get(&url)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(ProfError::NotFound("Image not found".to_string()));
        }

        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }

    pub fn get_profile_image_url(&self, uuid: Option<&str>) -> Result<String, ProfError> {
        let auth = self.get_auth_params()?;
        let target_uuid = uuid.unwrap_or_else(|| auth.get("uuid").unwrap());

        let mut url = format!("{}/user/{}/profile/image", self.base_url, target_uuid);
        
        // Add query parameters
        let query_params: Vec<String> = auth.iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        
        if !query_params.is_empty() {
            url.push('?');
            url.push_str(&query_params.join("&"));
        }

        Ok(url)
    }

    pub async fn health_check(&self) -> Result<HealthResponse, ProfError> {
        let url = format!("{}/health", self.base_url);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;

        let health: HealthResponse = response.json().await?;
        Ok(health)
    }

    pub async fn execute_spell(
        &self,
        spell_name: &str,
        spell_data: HashMap<String, serde_json::Value>,
    ) -> Result<MagicResponse, ProfError> {
        let auth = self.get_auth_params()?;
        let url = format!("{}/magic/spell/{}", self.base_url, spell_name);

        let mut request_data = spell_data;
        for (key, value) in auth {
            request_data.insert(key, serde_json::Value::String(value));
        }

        let response = self.client
            .post(&url)
            .json(&request_data)
            .send()
            .await?;

        let status = response.status();
        let response_data: MagicResponse = response.json().await?;

        if !response_data.success {
            return Err(ProfError::Service(response_data.error.unwrap_or_else(|| "Spell execution failed".to_string())));
        }

        Ok(response_data)
    }

    fn guess_mime_type(&self, filename: &str) -> &'static str {
        let extension = filename.split('.').last().unwrap_or("").to_lowercase();
        match extension.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "webp" => "image/webp",
            _ => "application/octet-stream",
        }
    }
}

// Builder pattern for creating profiles
#[derive(Debug, Default)]
pub struct ProfileBuilder {
    data: HashMap<String, serde_json::Value>,
}

impl ProfileBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn name(mut self, name: &str) -> Self {
        self.data.insert("name".to_string(), serde_json::Value::String(name.to_string()));
        self
    }

    pub fn email(mut self, email: &str) -> Self {
        self.data.insert("email".to_string(), serde_json::Value::String(email.to_string()));
        self
    }

    pub fn field<T: Serialize>(mut self, key: &str, value: T) -> Self {
        if let Ok(json_value) = serde_json::to_value(value) {
            self.data.insert(key.to_string(), json_value);
        }
        self
    }

    pub fn build(self) -> HashMap<String, serde_json::Value> {
        self.data
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_profile_builder() {
        let profile_data = ProfileBuilder::new()
            .name("John Doe")
            .email("john@example.com")
            .field("bio", "Software developer")
            .field("age", 30)
            .build();

        assert_eq!(profile_data.get("name").unwrap(), &serde_json::Value::String("John Doe".to_string()));
        assert_eq!(profile_data.get("email").unwrap(), &serde_json::Value::String("john@example.com".to_string()));
        assert_eq!(profile_data.get("bio").unwrap(), &serde_json::Value::String("Software developer".to_string()));
        assert_eq!(profile_data.get("age").unwrap(), &serde_json::Value::Number(serde_json::Number::from(30)));
    }

    #[tokio::test]
    async fn test_client_creation() {
        let client = ProfClient::new("http://localhost:3007".to_string());
        assert_eq!(client.base_url, "http://localhost:3007");
    }

    #[tokio::test]
    async fn test_health_check() {
        // This test requires a running prof server
        // Uncomment when testing against actual server
        /*
        let client = ProfClient::new("http://localhost:3007".to_string());
        let health = client.health_check().await.unwrap();
        assert_eq!(health.service, "prof");
        */
    }
}