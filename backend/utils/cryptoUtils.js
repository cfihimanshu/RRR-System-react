const crypto = require('crypto');

const CRYPTO_KEY = process.env.CRYPTO_KEY || 'default_secret_key_change_in_prod';
const ALGORITHM = 'aes-256-cbc';

// Helper to ensure key is exactly 32 bytes
const getSecureKey = () => {
    // Our key is already a 64-char hex string (32 bytes)
    return Buffer.from(CRYPTO_KEY, 'hex');
};

const encryptData = (data) => {
    try {
        if (!data) return data;
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, getSecureKey(), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Return IV + Encrypted Data (separated by colon)
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (err) {
        console.error('Encryption Error:', err);
        return data;
    }
};

module.exports = { encryptData };
