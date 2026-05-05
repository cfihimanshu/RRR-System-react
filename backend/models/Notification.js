const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: String, required: true }, // Email or Role
  type: { type: String, default: 'Info' }, // Info, Case, Task, etc.
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, // Optional link to the case or task
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
