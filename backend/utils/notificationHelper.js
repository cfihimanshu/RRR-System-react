const Notification = require('../models/Notification');

/**
 * Creates a system notification for a user or group
 * @param {string|string[]} recipient - User email, role, or 'All'
 * @param {string} title - Short title for the notification
 * @param {string} message - Detailed message
 * @param {string} type - Notification type (Info, Case, Task, etc.)
 * @param {string} link - Optional link to related entity
 */
const createNotification = async (recipient, title, message, type = 'Info', link = '') => {
  try {
    const recipients = Array.isArray(recipient) ? recipient : [recipient];
    
    const notifications = recipients.map(r => ({
      recipient: r,
      title,
      message,
      type,
      link,
      isRead: false
    }));

    await Notification.insertMany(notifications);
    return true;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return false;
  }
};

module.exports = { createNotification };
