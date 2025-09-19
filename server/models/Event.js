import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  eventType: {
    type: String,
    required: true,
    enum: ['focus_lost', 'face_missing', 'multiple_faces', 'suspicious_object', 'eye_closure', 'drowsiness', 'audio_detected']
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

export default mongoose.model('Event', eventSchema);
