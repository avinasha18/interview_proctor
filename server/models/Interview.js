import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  candidateEmail: {
    type: String,
    required: true,
    unique: true
  },
  candidateName: {
    type: String,
    required: true
  },
  interviewerEmail: {
    type: String,
    required: true
  },
  interviewerName: {
    type: String,
    required: true
  },
  interviewCode: {
    type: String,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'terminated'],
    default: 'scheduled'
  },
  duration: {
    type: Number // in minutes
  },
  integrityScore: {
    type: Number,
    default: 100
  },
  totalEvents: {
    type: Number,
    default: 0
  },
  focusLostCount: {
    type: Number,
    default: 0
  },
  suspiciousEventsCount: {
    type: Number,
    default: 0
  },
  videoUrl: {
    type: String,
    default: null
  },
  recordingStatus: {
    type: String,
    enum: ['not_started', 'recording', 'completed', 'failed'],
    default: 'not_started'
  }
});

export default mongoose.model('Interview', interviewSchema);
