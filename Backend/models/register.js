const mongoose = require('mongoose')

const registerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    occupation: { type: String, default: '' },
    skills: { type: String, default: '' },        
    bio: { type: String, default: '' },
    profile: { type: String, default: '' },       
    resume: { type: String, default: '' },        
    password: { type: String, required: true },   
  },
  { timestamps: true }
)

module.exports = mongoose.model('register', registerSchema)