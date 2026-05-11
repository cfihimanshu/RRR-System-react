import CryptoJS from 'crypto-js';

const CRYPTO_KEY = import.meta.env.VITE_CRYPTO_KEY || 'default_secret_key_change_in_prod';

// Helper to ensure key is exactly 32 bytes (same as backend)
const getSecureKey = () => {
    return CryptoJS.enc.Hex.parse(CRYPTO_KEY);
};

export const decryptData = (encryptedText) => {
    try {
        if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;

        // Split IV and Encrypted Data
        const parts = encryptedText.split(':');
        if (parts.length !== 2) return encryptedText;

        const iv = CryptoJS.enc.Hex.parse(parts[0]);
        const encrypted = parts[1];

        // We must parse the hex string to a WordArray first
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Hex.parse(encrypted)
        });

        const decrypted = CryptoJS.AES.decrypt(
            cipherParams,
            getSecureKey(),
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );

        let decryptedStr;
        try {
            decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
            if (!decryptedStr) {
                throw new Error('Empty decryption result (possibly wrong key)');
            }
        } catch (e) {
            console.error('UTF8 Decryption Error:', e);
            return encryptedText;
        }
        
        try {
            return JSON.parse(decryptedStr);
        } catch (e) {
            return decryptedStr;
        }
    } catch (err) {
        console.error('General Decryption Error:', err);
        return encryptedText;
    }
};
