import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, GraduationCap, Shield, Monitor, FileText } from 'lucide-react';

import InterviewerDashboard from './components/InterviewerDashboard';
import CandidatePortal from './components/CandidatePortal';
import { ThemeProvider } from './contexts/ThemeContext';
import { Card, CardContent, CardHeader } from './components/ui/Card';
import Button from './components/ui/Button';
import ThemeToggle from './components/ui/ThemeToggle';

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      
      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-4xl"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6"
            >
              <Shield className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Interview Proctoring System
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Professional AI-powered interview monitoring with real-time analysis and comprehensive reporting
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card hover className="h-full border-2 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    I'm an Interviewer
                  </h2>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Schedule interviews, monitor candidates in real-time, and access comprehensive reports with integrity scoring.
                  </p>
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Monitor className="w-4 h-4 text-indigo-500" />
                      <span>Live candidate monitoring</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>Detailed proctoring reports</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Shield className="w-4 h-4 text-indigo-500" />
                      <span>AI-powered integrity analysis</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setUserType('interviewer');
                      window.history.pushState({}, '', '?role=interviewer');
                    }}
                    className="w-full mt-6"
                    size="lg"
                  >
                    Access Interviewer Dashboard
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card hover className="h-full border-2 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mb-4">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    I'm a Candidate
                  </h2>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Join your scheduled interview session using your unique interview code and participate in the proctored session.
                  </p>
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Monitor className="w-4 h-4 text-emerald-500" />
                      <span>Secure video streaming</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span>Privacy-focused monitoring</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>Performance feedback</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setUserType('candidate');
                      window.history.pushState({}, '', '?role=candidate');
                    }}
                    variant="success"
                    className="w-full mt-6"
                    size="lg"
                  >
                    Join Interview Session
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-0">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    System Features
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { icon: Monitor, label: 'Real-time Monitoring', desc: 'Live video analysis' },
                    { icon: Shield, label: 'AI Detection', desc: 'Object & behavior detection' },
                    { icon: FileText, label: 'Comprehensive Reports', desc: 'PDF & CSV exports' },
                    { icon: Users, label: 'Multi-user Support', desc: 'Interviewer & candidate portals' }
                  ].map((feature, index) => (
                    <motion.div
                      key={feature.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="text-center"
                    >
                      <div className="mx-auto w-12 h-12 bg-white dark:bg-gray-600 rounded-xl flex items-center justify-center mb-3 shadow-sm">
                        <feature.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                        {feature.label}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {feature.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-white dark:bg-gray-600 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Quick Access Links</h4>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <a href="?role=interviewer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      Interviewer Portal
                    </a>
                    <span className="text-gray-400">•</span>
                    <a href="?role=candidate" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                      Candidate Portal
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );

  if (!userType) {
    return (
      <ThemeProvider>
        {renderUserTypeSelector()}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {/* Navigation Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`shadow-sm border-b border-gray-200 dark:border-gray-700 ${
            userType === 'interviewer' 
              ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20' 
              : 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20'
          }`}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  userType === 'interviewer' 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                    : 'bg-gradient-to-br from-emerald-500 to-green-600'
                }`}>
                  {userType === 'interviewer' ? (
                    <Users className="w-6 h-6 text-white" />
                  ) : (
                    <GraduationCap className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Proctoring System
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userType === 'interviewer' ? 'Interviewer Dashboard' : 'Candidate Portal'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <Button
                  onClick={() => {
                    setUserType(null);
                    window.history.pushState({}, '', '/');
                  }}
                  variant="outline"
                >
                  Switch Role
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={userType}
            initial={{ opacity: 0, x: userType === 'interviewer' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: userType === 'interviewer' ? 20 : -20 }}
            transition={{ duration: 0.3 }}
          >
            {userType === 'interviewer' ? (
              <InterviewerDashboard />
            ) : (
              <CandidatePortal initialCode={urlParams.code} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ThemeProvider>
  );
}

export default App;