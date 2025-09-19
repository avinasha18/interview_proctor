# 🧪 Testing Guide - Complete Proctoring System

## 🚀 Quick Start

1. **Start the system**:
   ```bash
   docker-compose up -d
   ```

2. **Access the application**: http://localhost:3000

## 📋 Complete Testing Flow

### **Step 1: Interviewer Setup**

1. **Open the application** in your browser
2. **Click "I'm an Interviewer"**
3. **Enter your email** (e.g., `interviewer@company.com`)
4. **Click "Access Dashboard"**
   - ✅ Should authenticate successfully
   - ✅ Should show empty interview list initially

### **Step 2: Schedule Interview**

1. **Click "Schedule Interview"**
2. **Fill in the form**:
   - Candidate Email: `candidate@email.com`
   - Candidate Name: `John Doe`
   - Your Name: `Jane Smith`
3. **Click "Schedule Interview"**
   - ✅ Should show success message
   - ✅ Should display interview code (e.g., `ABC123`)
   - ✅ Should copy the code to clipboard
   - ✅ Interview should appear in the list with "SCHEDULED" status

### **Step 3: Candidate Joins**

1. **Open a new browser tab/window**
2. **Go to** http://localhost:3000
3. **Click "I'm a Candidate"**
4. **Enter the interview code** (e.g., `ABC123`)
5. **Click "Join Interview"**
   - ✅ Should join successfully
   - ✅ Should show interview details
   - ✅ Should show "ACTIVE" status

### **Step 4: Live Monitoring**

1. **In the interviewer tab**:
   - ✅ Interview status should change to "ACTIVE"
   - ✅ Click "View Live" button
   - ✅ Should see live monitoring interface

2. **In the candidate tab**:
   - ✅ Click "Start Monitoring"
   - ✅ Allow camera access
   - ✅ Should see video feed

### **Step 5: Test Detection**

1. **Focus Detection**:
   - Look away from screen for >5 seconds
   - ✅ Should show "Focus Lost" event in both tabs

2. **Object Detection**:
   - Show a phone to the camera
   - ✅ Should show "Cell Phone detected!" event
   - Show a book to the camera
   - ✅ Should show "Book detected!" event

3. **Face Detection**:
   - Cover your face for >10 seconds
   - ✅ Should show "Face Missing" event
   - Have another person in frame
   - ✅ Should show "Multiple Faces" event

### **Step 6: End Interview**

1. **In the interviewer tab**:
   - Click "End Interview"
   - ✅ Interview should end
   - ✅ Should show completion summary

2. **In the candidate tab**:
   - ✅ Should automatically show report
   - ✅ Should display integrity score
   - ✅ Should show event breakdown

### **Step 7: Generate Reports**

1. **In the interviewer tab**:
   - ✅ Should see "View Report" button
   - ✅ Should see "Download PDF" button
   - Click "Download PDF"
   - ✅ Should download comprehensive PDF report

2. **In the candidate tab**:
   - ✅ Should see "Download PDF Report" button
   - ✅ Should see "Download CSV Data" button
   - Click "Download PDF Report"
   - ✅ Should download detailed PDF report

## 📊 Expected Report Contents

### **PDF Report Should Include**:
- ✅ Candidate Name & Email
- ✅ Interviewer Name & Email
- ✅ Interview Duration
- ✅ Focus Lost Count (>5 seconds)
- ✅ Suspicious Events (phones, books, multiple faces)
- ✅ Object Detection Details
- ✅ Integrity Score Calculation
- ✅ Detailed Event Log with Timestamps

### **Integrity Score Calculation**:
- ✅ Base Score: 100 points
- ✅ Focus Loss Deductions: -3 points each
- ✅ Suspicious Event Deductions: -5 points each
- ✅ Final Score: 100 - deductions

## 🔧 Troubleshooting

### **Common Issues**:

1. **Authentication Failed**:
   - Check email format (must contain @)
   - Check backend is running on port 3001

2. **Camera Not Working**:
   - Allow camera permissions
   - Check browser compatibility
   - Try different browser

3. **Events Not Showing**:
   - Check Python service is running on port 8000
   - Check WebSocket connection
   - Refresh the page

4. **Report Not Generating**:
   - Check interview is completed
   - Check backend API is accessible
   - Check browser popup blockers

### **Service Status Check**:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/health
- Python ML: http://localhost:8000/health

## 🎯 Success Criteria

### **System Should**:
- ✅ Authenticate interviewers with email
- ✅ Generate unique interview codes
- ✅ Allow candidates to join with codes
- ✅ Provide real-time monitoring
- ✅ Detect focus loss (>5 seconds)
- ✅ Detect suspicious objects (phones, books, etc.)
- ✅ Generate comprehensive PDF reports
- ✅ Show clear candidate reports
- ✅ Maintain interview history
- ✅ Calculate accurate integrity scores

### **User Experience Should Be**:
- ✅ Intuitive and professional
- ✅ Clear instructions and feedback
- ✅ Real-time updates
- ✅ Comprehensive reporting
- ✅ Easy navigation between roles

## 📈 Performance Expectations

- **Detection Accuracy**: >90% for common objects
- **Focus Detection**: Accurate within 1-2 seconds
- **Report Generation**: <5 seconds
- **Real-time Updates**: <1 second delay
- **System Responsiveness**: Smooth UI interactions

This testing guide ensures the complete end-to-end functionality works as expected!
