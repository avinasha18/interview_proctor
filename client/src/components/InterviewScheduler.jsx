import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { User, Mail, Calendar, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { Card, CardContent } from './ui/Card';
import Badge from './ui/Badge';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const InterviewScheduler = ({ interviewerEmail, onInterviewScheduled }) => {
  const [formData, setFormData] = useState({
    candidateEmail: '',
    candidateName: '',
    interviewerName: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.candidateEmail || !formData.candidateName || !formData.interviewerName) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/interviews/schedule`, {
        candidateEmail: formData.candidateEmail,
        candidateName: formData.candidateName,
        interviewerEmail: interviewerEmail,
        interviewerName: formData.interviewerName
      });

      if (response.data.success) {
        setSuccess({
          interviewCode: response.data.interview.interviewCode,
          candidateEmail: response.data.interview.candidateEmail,
          candidateName: response.data.interview.candidateName
        });
        setFormData({ candidateEmail: '', candidateName: '', interviewerName: '' });
        onInterviewScheduled();
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      setError(error.response?.data?.error || error.message || 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4"
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
              Interview Scheduled Successfully!
            </h3>
            <p className="text-green-700 dark:text-green-300 mb-6">
              The interview has been created and the candidate can now join using the code below.
            </p>
            
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Interview Code:</span>
                  <Badge variant="success" className="font-mono text-lg px-3 py-1">
                    {success.interviewCode}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Candidate:</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {success.candidateName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {success.candidateEmail}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => copyToClipboard(success.interviewCode)}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
                <Button
                  onClick={() => {
                    setSuccess(null);
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Schedule Another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 dark:text-red-300 font-medium">{error}</span>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Input
              label="Candidate Email"
              type="email"
              name="candidateEmail"
              value={formData.candidateEmail}
              onChange={handleInputChange}
              placeholder="candidate@email.com"
              required
              icon={<Mail className="w-4 h-4" />}
            />
          </div>

          <div className="space-y-2">
            <Input
              label="Candidate Name"
              type="text"
              name="candidateName"
              value={formData.candidateName}
              onChange={handleInputChange}
              placeholder="John Doe"
              required
              icon={<User className="w-4 h-4" />}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Input
            label="Interviewer Name"
            type="text"
            name="interviewerName"
            value={formData.interviewerName}
            onChange={handleInputChange}
            placeholder="Your Name"
            required
            icon={<User className="w-4 h-4" />}
          />
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Interview Details
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>• Interview will be scheduled immediately</p>
            <p>• Candidate will receive a unique interview code</p>
            <p>• Real-time monitoring will be active during the session</p>
            <p>• Comprehensive reports will be generated after completion</p>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            type="submit"
            loading={loading}
            className="flex-1"
            size="lg"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {loading ? 'Scheduling...' : 'Schedule Interview'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default InterviewScheduler;