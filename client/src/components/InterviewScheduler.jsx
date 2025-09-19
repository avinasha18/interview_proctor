import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:3001';

const InterviewScheduler = ({ interviewerEmail, onInterviewScheduled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    candidateEmail: '',
    candidateName: '',
    interviewerName: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.candidateEmail || !formData.candidateName || !formData.interviewerName) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
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
          candidateEmail: response.data.interview.candidateEmail
        });
        setFormData({ candidateEmail: '', candidateName: '', interviewerName: '' });
        onInterviewScheduled();
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Failed to schedule interview: ' + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Schedule New Interview</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isOpen ? 'Cancel' : 'Schedule Interview'}
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="candidateEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Email *
              </label>
              <input
                type="email"
                id="candidateEmail"
                name="candidateEmail"
                value={formData.candidateEmail}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="candidate@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Name *
              </label>
              <input
                type="text"
                id="candidateName"
                name="candidateName"
                value={formData.candidateName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="interviewerName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              id="interviewerName"
              name="interviewerName"
              value={formData.interviewerName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Jane Smith"
              required
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              }`}
            >
              {loading ? 'Scheduling...' : 'Schedule Interview'}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {success && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-medium text-green-800 mb-2">Interview Scheduled Successfully!</h3>
          <div className="space-y-2 text-sm text-green-700">
            <p><strong>Interview Code:</strong> {success.interviewCode}</p>
            <p><strong>Candidate Email:</strong> {success.candidateEmail}</p>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => copyToClipboard(success.interviewCode)}
                className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                Copy Code
              </button>
              <button
                onClick={() => copyToClipboard(`Interview Code: ${success.interviewCode}\nCandidate Email: ${success.candidateEmail}`)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                Copy All
              </button>
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">
            Share this code with the candidate to join the interview.
          </p>
        </div>
      )}
    </div>
  );
};

export default InterviewScheduler;
