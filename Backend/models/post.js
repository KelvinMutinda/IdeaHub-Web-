const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'register', required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const postSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'register', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    techstack: { type: String, default: '' },     
    price: { type: String, default: 'Free' },
    livedemo: { type: String, default: '' },
    code: { type: String, default: '' },
    link: { type: String, default: '' },

    images: { type: [String], default: [] },      
    video: { type: String, default: '' },         
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'register' }],  
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true }
)
postSchema.index({ createdAt: -1 })

module.exports = mongoose.model('post', postSchema)