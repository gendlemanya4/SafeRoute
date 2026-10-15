import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } },
  text: { type: String, maxlength: 500, default: '' },
  category: { type: String, default: 'other' },
  severity: { type: Number, min: 1, max: 3, default: 1 },
  spam: { type: Boolean, default: false },
  synthetic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
schema.index({ location: '2dsphere' });
export const Report = mongoose.model('Report', schema);
