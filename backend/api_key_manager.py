"""
API Key Management Module
Handles OpenAI API key validation and secure storage
"""

import os
import json
import base64
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
from pathlib import Path
import openai
from pydantic import BaseModel

class APIKeyRequest(BaseModel):
    api_key: str

class APIKeyResponse(BaseModel):
    is_valid: bool
    message: str
    model_access: Optional[Dict[str, Any]] = None

class APIKeyManager:
    def __init__(self):
        self.config_dir = Path.home() / ".covenantrix"
        self.config_file = self.config_dir / "config.json"
        self.key_file = self.config_dir / "encryption.key"
        
        # Ensure config directory exists
        self.config_dir.mkdir(exist_ok=True)
        
        # Initialize encryption
        self.cipher = self._get_or_create_cipher()
    
    def _get_or_create_cipher(self) -> Fernet:
        """Get or create encryption cipher for API key storage"""
        if self.key_file.exists():
            with open(self.key_file, 'rb') as f:
                key = f.read()
        else:
            key = Fernet.generate_key()
            with open(self.key_file, 'wb') as f:
                f.write(key)
        
        return Fernet(key)
    
    async def validate_openai_key(self, api_key: str) -> APIKeyResponse:
        """Validate OpenAI API key by making a test request"""
        try:
            client = openai.OpenAI(api_key=api_key)
            
            # Test with a minimal completion request
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=1
            )
            
            # If we get here, the key is valid
            return APIKeyResponse(
                is_valid=True,
                message="API key is valid and working",
                model_access={"gpt-3.5-turbo": True}
            )
            
        except openai.AuthenticationError:
            return APIKeyResponse(
                is_valid=False,
                message="Invalid API key"
            )
        except openai.RateLimitError:
            return APIKeyResponse(
                is_valid=True,
                message="API key is valid (rate limit reached)"
            )
        except openai.PermissionDeniedError:
            return APIKeyResponse(
                is_valid=False,
                message="API key exists but lacks permissions"
            )
        except Exception as e:
            return APIKeyResponse(
                is_valid=False,
                message=f"Validation failed: {str(e)}"
            )
    
    def save_api_key(self, api_key: str) -> bool:
        """Securely save API key to local config"""
        try:
            # Encrypt the API key
            encrypted_key = self.cipher.encrypt(api_key.encode())
            
            # Load existing config or create new
            config = {}
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
            
            # Update config
            config['openai_key'] = base64.b64encode(encrypted_key).decode()
            config['key_configured'] = True
            
            # Save config
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Failed to save API key: {e}")
            return False
    
    def load_api_key(self) -> Optional[str]:
        """Load and decrypt API key from local config"""
        try:
            if not self.config_file.exists():
                return None
            
            with open(self.config_file, 'r') as f:
                config = json.load(f)
            
            encrypted_key_b64 = config.get('openai_key')
            if not encrypted_key_b64:
                return None
            
            # Decrypt the API key
            encrypted_key = base64.b64decode(encrypted_key_b64)
            decrypted_key = self.cipher.decrypt(encrypted_key)
            
            return decrypted_key.decode()
        except Exception as e:
            print(f"Failed to load API key: {e}")
            return None
    
    def is_key_configured(self) -> bool:
        """Check if API key is configured"""
        try:
            if not self.config_file.exists():
                return False
            
            with open(self.config_file, 'r') as f:
                config = json.load(f)
            
            return config.get('key_configured', False)
        except Exception:
            return False
    
    def remove_api_key(self) -> bool:
        """Remove stored API key"""
        try:
            if not self.config_file.exists():
                return True
            
            with open(self.config_file, 'r') as f:
                config = json.load(f)
            
            config.pop('openai_key', None)
            config['key_configured'] = False
            
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Failed to remove API key: {e}")
            return False