import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Eye, 
  Users, 
  Smartphone, 
  AlertTriangle, 
  Volume2,
  Filter,
  Activity,
  Search,
  Calendar,
  TrendingUp,
  X,
  ChevronDown,
  Zap
} from 'lucide-react';

const EventLog = ({ events = [] }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const getEventIcon = (eventType) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (eventType) {
      case 'focus_lost':
        return <Clock {...iconProps} className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'face_missing':
        return <Eye {...iconProps} className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'multiple_faces':
        return <Users {...iconProps} className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'suspicious_object':
        return <Smartphone {...iconProps} className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'eye_closure':
        return <Eye {...iconProps} className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case 'drowsiness':
        return <Clock {...iconProps} className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case 'audio_detected':
        return <Volume2 {...iconProps} className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <AlertTriangle {...iconProps} className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'high':
        return {
          colors: 'border-l-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          pulse: 'bg-red-400'
        };
      case 'medium':
        return {
          colors: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50',
          badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
          pulse: 'bg-yellow-400'
        };
      case 'low':
        return {
          colors: 'border-l-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50',
          badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          pulse: 'bg-green-400'
        };
      default:
        return {
          colors: 'border-l-gray-500 bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-600',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
          pulse: 'bg-gray-400'
        };
    }
  };

  const filteredAndSortedEvents = events
    .filter(event => {
      const matchesFilter = filter === 'all' || event.eventType === filter;
      const matchesSeverity = selectedSeverity === 'all' || event.severity === selectedSeverity;
      const matchesSearch = event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.eventType.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSeverity && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp - a.timestamp;
      if (sortBy === 'oldest') return a.timestamp - b.timestamp;
      if (sortBy === 'severity') {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return 0;
    });

  const eventTypeCounts = events.reduce((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] || 0) + 1;
    return acc;
  }, {});

  const severityCounts = events.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1;
    return acc;
  }, {});

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Log</h3>
          </div>
          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full">
            {events.length} events
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-600 p-3 rounded-lg border border-gray-200 dark:border-gray-500">
            <div className="text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">High</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{severityCounts.high || 0}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-600 p-3 rounded-lg border border-gray-200 dark:border-gray-500">
            <div className="text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Medium</p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{severityCounts.medium || 0}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-600 p-3 rounded-lg border border-gray-200 dark:border-gray-500">
            <div className="text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Low</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{severityCounts.low || 0}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="all">All Events</option>
            <option value="focus_lost">Focus Lost</option>
            <option value="face_missing">Face Missing</option>
            <option value="multiple_faces">Multiple Faces</option>
            <option value="suspicious_object">Suspicious Objects</option>
            <option value="eye_closure">Eye Closure</option>
            <option value="audio_detected">Audio Detected</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="all">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="severity">By Severity</option>
          </select>
        </div>

      </div>

      {/* Event List */}
      <div className="h-96 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Events Found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filter !== 'all' || selectedSeverity !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'System is monitoring for events...'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedEvents.map((event, index) => {
                const severityConfig = getSeverityConfig(event.severity);
                return (
                  <div
                    key={event.id || `${event.timestamp}-${index}`}
                    className={`p-3 border-l-4 rounded-lg ${severityConfig.colors} hover:shadow-md transition-all duration-200`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(event.eventType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {event.eventType.replace('_', ' ').toUpperCase()}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityConfig.badge}`}>
                              {event.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                          {event.message}
                        </p>
                        
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 text-xs">
                            {Object.entries(event.metadata).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EventLog;