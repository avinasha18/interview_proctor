import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { User, Mail, Calendar, Copy, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';

import { BACKEND_URL } from '../utils/config';

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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mx-auto w-12 h-12 bg-green-500 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-6 h-6 text-white" />
          </motion.div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Interview Created!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share this code with the candidate
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interview Code</div>
              <div className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 px-4 py-2 rounded border">
                {success.interviewCode}
              </div>
            </div>
            
            <div className="text-center space-y-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {success.candidateName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {success.candidateEmail}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => copyToClipboard(success.interviewCode)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button
              onClick={() => {
                setSuccess(null);
                setError(null);
              }}
              size="sm"
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Schedule Interview
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create a new interview session
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
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

          <Input
            label="Your Name"
            type="text"
            name="interviewerName"
            value={formData.interviewerName}
            onChange={handleInputChange}
            placeholder="Interviewer Name"
            required
            icon={<User className="w-4 h-4" />}
          />
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          <Calendar className="w-4 h-4 mr-2" />
          {loading ? 'Creating...' : 'Create Interview'}
        </Button>
      </form>
    </motion.div>
  );
};

export default InterviewScheduler;