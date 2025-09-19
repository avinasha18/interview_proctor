import React, { useState } from 'react';

const InterviewSetup = ({ onStartInterview }) => {
  const [candidateName, setCandidateName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!candidateName.trim() || !interviewerName.trim()) {
      alert('Please fill in both candidate and interviewer names');
      return;
    }

    setIsLoading(true);
    try {
      await onStartInterview(candidateName.trim(), interviewerName.trim());
    } catch (error) {
      console.error('Error starting interview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Start New Interview</h2>
          <p className="text-gray-600">Enter the details to begin the proctoring session</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-2">
              Candidate Name
            </label>
            <input
              type="text"
              id="candidateName"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter candidate name"
              required
            />
          </div>

          <div>
            <label htmlFor="interviewerName" className="block text-sm font-medium text-gray-700 mb-2">
              Interviewer Name
            </label>
            <input
              type="text"
              id="interviewerName"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter interviewer name"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? 'Starting Interview...' : 'Start Interview'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Camera and microphone access will be requested</li>
            <li>• Real-time monitoring will begin automatically</li>
            <li>• Suspicious activities will be logged and displayed</li>
            <li>• Reports can be downloaded at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
