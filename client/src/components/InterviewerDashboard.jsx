import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Calendar,
  Users, 
  Video,
  FileText,
  Download,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  LogOut,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Settings
} from 'lucide-react';

import InterviewScheduler from './InterviewScheduler';
import InterviewerLiveView from './InterviewerLiveView';
import Button from './ui/Button';
import Input from './ui/Input';
import { Card, CardContent, CardHeader } from './ui/Card';
import Badge from './ui/Badge';
import ThemeToggle from './ui/ThemeToggle';

const BACKEND_URL = process.env.VITE_BACKEND_URL;

const InterviewerDashboard = () => {
  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  // Load saved state from localStorage on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('interviewerEmail');
    const savedAuth = localStorage.getItem('isAuthenticated');
    
    if (savedEmail && savedAuth === 'true') {
      setInterviewerEmail(savedEmail);
      setIsAuthenticated(true);
    }
  }, []);

  const authenticateInterviewer = async () => {
    if (!interviewerEmail.trim()) {
      alert('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      // First authenticate the interviewer
      const authResponse = await axios.post(`${BACKEND_URL}/api/interviews/authenticate-interviewer`, {
        email: interviewerEmail
      });
      
      if (authResponse.data.success) {
        // Then fetch their interviews
        const interviewsResponse = await axios.get(`${BACKEND_URL}/api/interviews/interviewer/${interviewerEmail}`);
          if (interviewsResponse.data.success) {
            setInterviews(interviewsResponse.data.interviews);
            setIsAuthenticated(true);
            
            // Save state to localStorage
            localStorage.setItem('interviewerEmail', interviewerEmail);
            localStorage.setItem('isAuthenticated', 'true');
          }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      alert('Failed to authenticate. Please check your email format.');
    } finally {
      setLoading(false);
    }
  };

  const refreshInterviews = async () => {
    if (interviewerEmail) {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/interviews/interviewer/${interviewerEmail}`);
        if (response.data.success) {
          const activeInterviews = response.data.interviews.filter(interview => 
            interview.status !== 'terminated'
          );
          setInterviews(activeInterviews);
        }
      } catch (error) {
        console.error('Failed to refresh interviews:', error);
      }
    }
  };

  const deleteInterview = async (interviewId) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone and will also delete the video from Cloudinary.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting interview:', interviewId);
      const response = await axios.delete(`${BACKEND_URL}/api/interviews/${interviewId}`);
      
      if (response.data.success) {
        console.log('✅ Interview deleted successfully');
        alert('Interview deleted successfully!');
        refreshInterviews();
      } else {
        throw new Error(response.data.error || 'Failed to delete interview');
      }
    } catch (error) {
      console.error('❌ Error deleting interview:', error);
      alert('Failed to delete interview: ' + error.message);
    }
  };

  const deleteAllInterviews = async () => {
    if (!confirm('Are you sure you want to delete ALL interviews? This action cannot be undone and will also delete all videos from Cloudinary.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting all interviews');
      const response = await axios.delete(`${BACKEND_URL}/api/interviews/interviewer/${interviewerEmail}/all`);
      
      if (response.data.success) {
        console.log('✅ All interviews deleted successfully');
        alert('All interviews deleted successfully!');
        setInterviews([]);
      } else {
        throw new Error(response.data.error || 'Failed to delete all interviews');
      }
    } catch (error) {
      console.error('❌ Error deleting all interviews:', error);
      alert('Failed to delete all interviews: ' + error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('interviewerEmail');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('selectedInterview');
    setInterviewerEmail('');
    setIsAuthenticated(false);
    setInterviews([]);
    setSelectedInterview(null);
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshInterviews();
      const interval = setInterval(refreshInterviews, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, interviewerEmail]);

  // Calculate dashboard stats
  const stats = {
    total: interviews.length,
    active: interviews.filter(i => i.status === 'active').length,
    completed: interviews.filter(i => i.status === 'completed').length,
    scheduled: interviews.filter(i => i.status === 'scheduled').length,
    avgIntegrityScore: interviews.length > 0 
      ? Math.round(interviews.reduce((sum, i) => sum + (i.integrityScore || 0), 0) / interviews.length)
      : 0
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="flex items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-2xl">
              <CardHeader className="text-center space-y-4 pb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center"
                >
                  <Shield className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Interviewer Portal
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Enter your email to access your dashboard
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    value={interviewerEmail || ''}
                    onChange={(e) => setInterviewerEmail(e.target.value)}
                    placeholder="interviewer@company.com"
                    required
                  />

                  <Button
                    onClick={authenticateInterviewer}
                    loading={loading}
                    className="w-full py-4 text-lg"
                    size="xl"
                  >
                    {loading ? 'Authenticating...' : 'Access Dashboard'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (selectedInterview) {
    return (
      <InterviewerLiveView
        interview={selectedInterview}
        onBack={() => setSelectedInterview(null)}
        onRefresh={refreshInterviews}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">Interviewer Dashboard</h1>
                  <div className="flex items-center space-x-2 text-indigo-100">
                    <Users className="w-4 h-4" />
                    <span>Welcome, {interviewerEmail}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={refreshInterviews}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  {interviews.length > 0 && (
                    <Button
                      onClick={deleteAllInterviews}
                      variant="danger"
                      className="bg-red-500/80 hover:bg-red-500"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete All
                    </Button>
                  )}
                  <Button
                    onClick={logout}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
        >
          {[
            { label: 'Total Interviews', value: stats.total, icon: FileText, color: 'indigo' },
            { label: 'Active Now', value: stats.active, icon: Video, color: 'success' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'info' },
            { label: 'Scheduled', value: stats.scheduled, icon: Clock, color: 'warning' },
            { label: 'Avg. Integrity', value: `${stats.avgIntegrityScore}%`, icon: BarChart3, color: stats.avgIntegrityScore >= 80 ? 'success' : stats.avgIntegrityScore >= 60 ? 'warning' : 'error' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <Card hover className="text-center">
                <CardContent className="p-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 200 }}
                    className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
                      stat.color === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      stat.color === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                      stat.color === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                      stat.color === 'info' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                    }`}
                  >
                    <stat.icon className="w-6 h-6" />
                  </motion.div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Schedule Interview Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4"
              >
                <Plus className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Schedule New Interview
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Create a new interview session with candidate details and monitoring settings
              </p>
              <Button
                onClick={() => setShowScheduler(!showScheduler)}
                variant={showScheduler ? 'secondary' : 'primary'}
                size="lg"
                className="px-8 py-3"
              >
                <Plus className="w-5 h-5 mr-2" />
                {showScheduler ? 'Cancel Scheduling' : 'Schedule Interview'}
              </Button>
            </CardContent>
          </Card>
          
          <AnimatePresence>
            {showScheduler && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <Card className="border-indigo-200 dark:border-indigo-800">
                  <CardHeader>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Interview Details
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <InterviewScheduler 
                      interviewerEmail={interviewerEmail}
                      onInterviewScheduled={() => {
                        refreshInterviews();
                        setShowScheduler(false);
                      }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Interviews List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Interview Management</h2>
                <div className="flex space-x-2">
                  <Badge variant="indigo">{interviews.length} total</Badge>
                  <Badge variant="success">{stats.completed} completed</Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {interviews.length === 0 ? (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4"
                  >
                    <Calendar className="w-full h-full" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No interviews scheduled yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Schedule your first interview to get started
                  </p>
                  <Button
                    onClick={() => setShowScheduler(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Interview
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  <AnimatePresence mode="popLayout">
                    {interviews.map((interview, index) => (
                      <motion.div
                        key={interview._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {interview.candidateName}
                              </h3>
                              <Badge 
                                variant={
                                  interview.status === 'active' ? 'success' :
                                  interview.status === 'completed' ? 'info' :
                                  interview.status === 'scheduled' ? 'warning' :
                                  'default'
                                }
                              >
                                {interview.status.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                  <Users className="w-4 h-4 mr-2" />
                                  <span>{interview.candidateEmail}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  <span>{new Date(interview.startTime).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                  <span className="text-gray-600 dark:text-gray-400 mr-2">Code:</span>
                                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs">
                                    {interview.interviewCode}
                                  </code>
                                </div>
                              </div>
                              
                              {interview.status === 'completed' && (
                                <div className="grid grid-cols-3 gap-4 text-center">
                                  <div>
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {interview.duration || 0}
                                    </div>
                                    <div className="text-xs text-gray-500">Minutes</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                      {interview.focusLostCount || 0}
                                    </div>
                                    <div className="text-xs text-gray-500">Focus Lost</div>
                                  </div>
                                  <div>
                                    <div className={`text-lg font-bold ${
                                      (interview.integrityScore || 0) >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                                      (interview.integrityScore || 0) >= 60 ? 'text-amber-600 dark:text-amber-400' :
                                      'text-red-600 dark:text-red-400'
                                    }`}>
                                      {interview.integrityScore || 0}%
                                    </div>
                                    <div className="text-xs text-gray-500">Integrity</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2 ml-6">
                            {interview.status === 'active' && (
                              <Button
                                onClick={() => setSelectedInterview(interview)}
                                variant="success"
                                className="animate-pulse"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Live
                              </Button>
                            )}
                            
                            {interview.status === 'completed' && (
                              <>
                                <Button
                                  onClick={() => setSelectedInterview(interview)}
                                  variant="primary"
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  View Report
                                </Button>
                                
                                {interview.videoUrl && (
                                  <Button
                                    onClick={() => window.open(interview.videoUrl, '_blank')}
                                    variant="secondary"
                                    size="sm"
                                  >
                                    <Video className="w-4 h-4 mr-2" />
                                    Video
                                  </Button>
                                )}
                                
                                <Button
                                  onClick={() => window.open(`${BACKEND_URL}/api/reports/${interview._id}/pdf`, '_blank')}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  PDF
                                </Button>
                              </>
                            )}
                            
                            {interview.status === 'scheduled' && (
                              <Badge variant="warning" className="text-center py-2">
                                <Clock className="w-4 h-4 mr-2" />
                                Waiting
                              </Badge>
                            )}
                            
                            <Button
                              onClick={() => deleteInterview(interview._id)}
                              variant="danger"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default InterviewerDashboard;