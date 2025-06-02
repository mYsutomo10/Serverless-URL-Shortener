const { v4: uuidv4 } = require('uuid');

class ShortCodeGenerator {
  static generateShortCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  static generateUniqueId() {
    return uuidv4();
  }

  static isValidShortCode(shortCode) {
    const regex = /^[A-Za-z0-9]{6,10}$/;
    return regex.test(shortCode);
  }
}

module.exports = ShortCodeGenerator;