const mongoose = require('mongoose')

const postSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'register', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    techstack: { type: String, default: '' },     // comma separated, e.g. "React, Node"
    price: { type: String, default: 'Free' },
    livedemo: { type: String, default: '' },
    code: { type: String, default: '' },
    link: { type: String, default: '' },
  },
  { timestamps: true }
)
postSchema.index({ createdAt: -1 })

module.exports = mongoose.model('post', postSchema)