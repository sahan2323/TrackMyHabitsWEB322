// models/Task.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const Task = sequelize.define('Task', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  userId: {
    type: DataTypes.STRING, // MongoDB User._id
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'Tasks' // ensure table name consistency
});

// Export the model only
module.exports = Task;
