# ISO 21001:2018 Complaint Appeals Integration

## Overview

This application implements **ISO 21001:2018 Educational Organizations Management System** standard, specifically **MO-4.16: Handling Complaint's Appeals**. This ensures a structured, auditable, and time-bound process for managing formal complaints and appeals.

## ISO 21001:2018 Reference

**Standard:** ISO 21001:2018 - Educational organizations — Management systems for educational organizations — Requirements with guidance for use

**Section:** MO-4.16 Handling Complaint's Appeals

**Purpose:** To provide a formal mechanism for appellants to challenge decisions made on their complaints through a transparent, multi-level approval process with defined timelines and responsibilities.

---

## Two Appeal Pathways

### 1. **Post-Rejection Appeals** (Traditional)
Users can submit an appeal **after** their report has been rejected by administrators.

**When to use:**
- Report has already been reviewed and rejected
- User disagrees with the rejection decision
- User wants to provide additional evidence or context

**Process:**
1. User views rejected report
2. Clicks "Submit Appeal" button
3. Enters appeal reason and optional evidence
4. Appeal enters ISO 21001 workflow

### 2. **ISO Formal Complaints** (Direct)
Users can mark their report as an **ISO 21001:2018 Formal Complaint** during initial submission.

**When to use:**
- Serious complaints requiring formal handling
- Issues requiring transparent multi-level review
- Reports where structured decision-making is critical

**Process:**
1. User submits new report
2. Checks "Mark as ISO 21001:2018 Formal Complaint"
3. Report status: `pending_iso_review`
4. Appeal record automatically created
5. Enters ISO 10-stage workflow immediately

---

## 10-Stage ISO Approval Workflow

The system implements a complete 10-stage process as mandated by ISO 21001:2018:

### **Stage 1: Submission** (Process Owner)
- **Role:** User/Complainant
- **Action:** Submits letter of appeal with reason and evidence
- **Timeline:** Initial submission
- **Status:** `submitted`

### **Stage 2: Admin Review** (Planning & Quality Management Officer)
- **Role:** Admin
- **Action:** Reviews appeal for completeness and validity
- **Timeline:** 1 hour
- **Status:** `under_admin_review`
- **Notifications:** Admins notified of new appeal

### **Stage 3: Documentation** (Document Control Officer)
- **Role:** Admin
- **Action:** Records appeal details in system, ensures audit trail
- **Timeline:** 1 hour
- **Status:** `documented`

### **Stage 4: Forward to Department**
- **Role:** Admin
- **Action:** Routes appeal to appropriate department head
- **Timeline:** 24 hours (1 day)
- **Status:** `with_department`
- **Notifications:** Department heads notified

### **Stage 5: Department Review** (Concerned Head of Office)
- **Role:** Department Head
- **Action:** Reviews complaint, proposes course of action
- **Timeline:** 72 hours (3 days)
- **Status:** `with_department`

### **Stage 6: President Decision** (School President)
- **Role:** President
- **Action:** Makes final decision: Approve or Disapprove
- **Timeline:** 120 hours (5 days)
- **Status:** `with_president`
- **Decision:** `approved` or `disapproved`
- **Notifications:** User notified of final decision

### **Stage 7: Processing** (IA Director)
- **Role:** Internal Audit Director
- **Action:** Processes decision, updates records
- **Timeline:** 24 hours (1 day)
- **Status:** `approved` or `disapproved`

### **Stage 8-10: Completion**
- **Role:** Admin
- **Action:** Closes appeal, presents result to appellant
- **Status:** `completed`
- **Outcome:** 
  - **If Approved:** Report restored to `pending` status
  - **If Disapproved:** Appeal marked as final, no further action

---

## Timeline Requirements

Per ISO 21001:2018, each stage has strict deadlines:

| Stage | Role | Deadline | Total Time |
|-------|------|----------|------------|
| 1 | User | Immediate | 0h |
| 2 | Admin Review | 1 hour | 1h |
| 3 | Documentation | 1 hour | 2h |
| 4 | Forward | 1 day | 26h |
| 5 | Department | 3 days | 98h |
| 6 | President | 5 days | 218h |
| 7-10 | Completion | 1 day | 242h |

**Maximum Total Time:** 10 days, 2 hours

---

## Role-Based Access Control

### **Users/Students**
- Submit appeals for their own rejected reports
- Mark new reports as ISO formal complaints
- View status of their appeals
- Receive notifications at key stages

### **Admins (Planning & Quality Officers)**
- Review new appeals (Stage 2)
- Complete documentation (Stage 3)
- Forward to department heads (Stage 4)
- Mark appeals as completed (Stage 7-10)

### **Department Heads**
- Receive appeals forwarded to their department
- Review and propose course of action (Stage 5)
- Submit recommendations to President

### **President**
- Receive appeals from department heads
- Make final approval/disapproval decision (Stage 6)
- Provide reasoning for decision

### **Super Admins**
- Full access to all stages
- Can perform any role's actions
- Monitor system compliance

---

## Implementation Details

### Mobile App Files

#### **ReportScreen.js**
- Added ISO complaint toggle checkbox
- Orange "ISO" badge
- Info panel explaining 10-stage process
- Auto-creates appeal when `isISOComplaint` is checked

#### **AppealScreen.js**
- Appeal submission form
- 50-character minimum reason validation
- Evidence upload (optional)
- 10-stage progress tracker
- Real-time status display
- Timeline information

#### **PostDetailScreen.js**
- Appeal button for rejected reports
- Appeal status banner
- Navigation to AppealScreen

### Admin Panel Files

#### **AppealsManagement.js**
- Complete appeals dashboard
- Visual stepper showing 10 stages
- Role-based action buttons
- Timeline tracking with deadlines
- "OVERDUE" warnings
- Evidence display
- Notes and proposal inputs

#### **Sidebar.js**
- "Appeals" menu item with orange ISO badge
- Direct navigation to appeals management

### Backend Services

#### **services/appealService.js**
- `submitAppeal()` - Creates appeal record
- `adminReviewAppeal()` - Admin review (Stage 2)
- `documentAppeal()` - Documentation (Stage 3)
- `forwardToDepartment()` - Route to dept (Stage 4)
- `departmentReview()` - Dept proposal (Stage 5)
- `presidentDecision()` - Final decision (Stage 6)
- `completeAppeal()` - Close process (Stage 7-10)
- Timeline calculation helpers
- Notification system integration

#### **services/reportService.js**
- Handles `isISOComplaint` flag
- Sets status to `pending_iso_review`
- Auto-creates appeal record
- Links report to appeal

### Database Schema

#### **appeals** Collection
```javascript
{
  reportId: string,           // Reference to original report
  userId: string,             // Appellant user ID
  userName: string,           // Appellant name
  userEmail: string,          // Appellant email
  reportTitle: string,        // Original report title
  reason: string,             // Appeal reason
  evidence: [string],         // Evidence URLs
  status: string,             // Current status
  currentStage: number,       // 1-10
  timeline: {
    submitted: timestamp,
    adminReviewStarted: timestamp,
    documented: timestamp,
    forwardedToDepartment: timestamp,
    departmentProposalSubmitted: timestamp,
    presidentDecision: timestamp,
    completed: timestamp,
    currentStageDeadline: timestamp
  },
  stages: [{
    stageNumber: number,
    status: string,           // pending, in_progress, completed
    assignedTo: string,       // Role assigned
    startedAt: timestamp,
    completedAt: timestamp,
    completedBy: string,
    notes: string,
    proposal: string,         // For dept stage
    decision: string          // For president stage
  }],
  finalDecision: string,      // approved/disapproved
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **reports** Collection Updates
```javascript
{
  ...existing fields,
  isISOComplaint: boolean,        // Marked as ISO complaint
  appealStatus: string,           // Current appeal status
  appealId: string,               // Reference to appeal
  appealedAt: timestamp,          // When appeal submitted
  restoredByAppeal: boolean,      // If approved and restored
  restoredAt: timestamp           // When restored
}
```

### Security Rules (firestore.rules)

```javascript
// Appeals collection
match /appeals/{appealId} {
  // Users can read their own appeals, staff can read all
  allow read: if isAuthenticated() && 
                 (resource.data.userId == request.auth.uid || 
                  isAdmin() || 
                  isDepartmentHead() || 
                  isPresident());
  
  // Users can only create appeals for their own reports
  allow create: if isAuthenticated() && 
                   request.resource.data.userId == request.auth.uid;
  
  // Role-based update permissions
  allow update: if isAuthenticated() && (
                   (isAdmin() && resource.data.currentStage <= 7) ||
                   (isDepartmentHead() && resource.data.currentStage in [4, 5]) ||
                   (isPresident() && resource.data.currentStage in [6, 7])
                 );
  
  // Only admins can delete (audit trail preserved)
  allow delete: if isAdmin() && resource.data.status != 'completed';
}
```

---

## Notification System

Users receive notifications at each critical stage:

### **User Notifications**
1. **Appeal Submitted** - Confirmation of submission
2. **Under Review** - Admin has started review
3. **With Department** - Forwarded to department
4. **With President** - Final review stage
5. **Decision Made** - Approved or Disapproved
6. **Completed** - Process finalized

### **Admin Notifications**
1. **New Appeal** - When user submits appeal
2. **Deadline Warning** - 1 hour before stage deadline
3. **Overdue Alert** - Stage past deadline

### **Department Head Notifications**
1. **Appeal Forwarded** - New appeal requires review
2. **Deadline Warning** - 24 hours before 3-day deadline

### **President Notifications**
1. **Department Proposal** - Ready for final decision
2. **Deadline Warning** - 24 hours before 5-day deadline

---

## Usage Instructions

### For Users

#### **Submit Post-Rejection Appeal:**
1. Open app → Navigate to rejected report
2. Click orange "Submit Appeal (ISO 21001:2018)" button
3. Enter reason (minimum 50 characters)
4. Upload evidence (optional)
5. Click "Submit Appeal"
6. Track progress in real-time

#### **Submit ISO Formal Complaint:**
1. Open app → Click "+" button to create report
2. Fill in title, description, category
3. Check "Mark as ISO 21001:2018 Formal Complaint"
4. Read info panel about 10-stage process
5. Click "Submit Report"
6. Appeal automatically created and tracked

### For Admins

#### **Review Appeals:**
1. Open admin panel → Click "Appeals" in sidebar
2. View all appeals with status badges
3. Click "View Details" to see full timeline
4. Actions available:
   - **Start Admin Review** (Stage 2)
   - **Complete Documentation** (Stage 3)
   - **Forward to Department** (Stage 4)
   - **Mark Complete** (Stage 7-10)

### For Department Heads

#### **Review and Propose:**
1. Receive notification of forwarded appeal
2. Open admin panel → Navigate to Appeals
3. Click "Submit Proposal" on assigned appeal
4. Enter recommendation and proposed action
5. Submit (auto-forwards to President)

### For Presidents

#### **Make Final Decision:**
1. Receive notification with department proposal
2. Open admin panel → Navigate to Appeals
3. Review full appeal history and proposal
4. Click "Approve" or "Disapprove"
5. Enter reasoning for decision
6. Submit (user immediately notified)

---

## Testing the System

### Test Scenario 1: Post-Rejection Appeal
```
1. User submits regular report
2. Admin rejects report
3. User clicks "Submit Appeal"
4. Admin reviews (Stage 2)
5. Admin documents (Stage 3)
6. Admin forwards to dept (Stage 4)
7. Dept head submits proposal (Stage 5)
8. President approves (Stage 6)
9. Report restored to pending
10. User receives approval notification
```

### Test Scenario 2: ISO Direct Complaint
```
1. User creates new report
2. Checks "ISO 21001:2018 Formal Complaint"
3. Submits report
4. Appeal auto-created with status "submitted"
5. Admin receives notification
6. Follow same stages 2-10 as above
```

---

## Compliance Checklist

✅ **Process Documentation** - Full 10-stage workflow documented  
✅ **Timeline Enforcement** - Deadlines calculated and tracked  
✅ **Role Separation** - Distinct roles with specific permissions  
✅ **Audit Trail** - All actions timestamped and logged  
✅ **Notification System** - Stakeholders notified at each stage  
✅ **Final Decision Authority** - President has ultimate authority  
✅ **Transparency** - Users can track appeal progress  
✅ **Evidence Support** - Photo/document upload capability  
✅ **Security** - Role-based access control enforced  
✅ **Immutability** - Completed appeals cannot be deleted  

---

## Benefits of ISO 21001:2018 Integration

### **For Educational Institutions**
- Demonstrates commitment to quality management
- Meets international standards for complaint handling
- Provides structured decision-making framework
- Ensures accountability at all levels
- Protects institution from arbitrary decisions

### **For Students**
- Fair and transparent appeal process
- Clear timelines and expectations
- Multiple levels of review
- Evidence-based decision making
- Notification of progress at every stage

### **For Administrators**
- Clear procedures and responsibilities
- Audit trail for compliance
- Reduced risk of litigation
- Improved institutional reputation
- Systematic approach to conflict resolution

---

## Future Enhancements

1. **Analytics Dashboard** - Track appeal success rates, average processing times
2. **Email Integration** - Send email notifications in addition to in-app
3. **Document Management** - Attach PDFs, signed documents
4. **Auto-escalation** - Automatic escalation when deadlines missed
5. **Reporting** - Generate ISO compliance reports
6. **Multi-language** - Support for international institutions

---

## Support & Contact

For questions about ISO 21001:2018 compliance or technical implementation:
- Review this documentation
- Check `services/appealService.js` for workflow logic
- Inspect `admin-web/src/components/AppealsManagement.js` for UI
- Test with sample appeals in development environment

---

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  
**Standard Reference:** ISO 21001:2018 MO-4.16
