import React, { useState, useEffect } from 'react';
import InterviewerDashboard from './components/InterviewerDashboard';
import CandidatePortal from './components/CandidatePortal';
import './App.css';

function App() {
  const [userType, setUserType] = useState(null);
  const [urlParams, setUrlParams] = useState({});

  useEffect(() => {
    // Check URL parameters for role routing
    const urlSearchParams = new URLSearchParams(window.location.search);
    const role = urlSearchParams.get('role');
    const code = urlSearchParams.get('code');
    
    if (role === 'interviewer') {
      setUserType('interviewer');
    } else if (role === 'candidate' || code) {
      setUserType('candidate');
    }
    
    setUrlParams({ role, code });
  }, []);

  const renderUserTypeSelector = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Proctoring System</h1>
          <p className="text-gray-600">Choose your role to continue</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => {
              setUserType('interviewer');
              window.history.pushState({}, '', '?role=interviewer');
            }}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
          >
            👨‍💼 I'm an Interviewer
          </button>
          
          <button
            onClick={() => {
              setUserType('candidate');
              window.history.pushState({}, '', '?role=candidate');
            }}
            className="w-full py-4 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-medium"
          >
            👨‍🎓 I'm a Candidate
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Quick Access</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Interviewer:</strong> <a href="?role=interviewer" className="text-blue-600 hover:underline">?role=interviewer</a></p>
            <p><strong>Candidate:</strong> <a href="?role=candidate" className="text-green-600 hover:underline">?role=candidate</a></p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">About This System</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Real-time video monitoring</li>
            <li>• Focus and object detection</li>
            <li>• Comprehensive reporting</li>
            <li>• Email-based interview management</li>
          </ul>
        </div>
      </div>
    </div>
  );

  if (!userType) {
    return renderUserTypeSelector();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className={`shadow-sm border-b ${userType === 'interviewer' ? 'bg-blue-50' : 'bg-green-50'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Proctoring System</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                userType === 'interviewer' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {userType === 'interviewer' ? 'Interviewer Dashboard' : 'Candidate Portal'}
              </span>
            </div>
            <button
              onClick={() => {
                setUserType(null);
                window.history.pushState({}, '', '/');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Switch Role
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {userType === 'interviewer' ? (
          <InterviewerDashboard />
        ) : (
          <CandidatePortal initialCode={urlParams.code} />
        )}
      </div>
    </div>
  );
}

export default App;