// Appeal Screen - ISO 21001:2018 Compliant
// Allows users to submit appeals for rejected reports
// Reference: MO-4.16 Handling Complaint's Appeals

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from './App';
import AppealService, { APPEAL_STATUS } from './services/appealService';
import * as ImagePicker from 'expo-image-picker';

const AppealScreen = ({ route, navigation }) => {
  const { reportId, reportTitle } = route.params;
  const { user: userData } = useUser();
  
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [existingAppeal, setExistingAppeal] = useState(null);

  useEffect(() => {
    checkExistingAppeal();
  }, []);

  const checkExistingAppeal = async () => {
    try {
      const result = await AppealService.getUserAppeals(userData.uid);
      if (result.success) {
        const appeal = result.appeals.find(a => a.reportId === reportId);
        if (appeal) {
          setExistingAppeal(appeal);
        }
      }
    } catch (error) {
      console.error('Error checking existing appeal:', error);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for your appeal.');
      return;
    }

    if (reason.trim().length < 50) {
      Alert.alert(
        'Too Short',
        'Please provide a detailed reason (at least 50 characters) explaining why you believe the decision should be reconsidered.'
      );
      return;
    }

    Alert.alert(
      'Submit Appeal',
      'Once submitted, your appeal will be reviewed according to ISO 21001:2018 standards. This process may take up to 10 days. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setLoading(true);
            try {
              const appealData = {
                reason: reason.trim(),
                evidence: evidence,
                userName: userData.displayName || 'Unknown',
                userEmail: userData.email || ''
              };

              const result = await AppealService.submitAppeal(
                reportId,
                userData.uid,
                appealData
              );

              if (result.success) {
                Alert.alert(
                  'Appeal Submitted',
                  'Your appeal has been submitted successfully. You will be notified of the decision within 10 days as per ISO 21001:2018 standards.\n\nReference: MO-4.16',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to submit appeal');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while submitting your appeal');
              console.error('Error submitting appeal:', error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      allowsEditing: false
    });

    if (!result.canceled && result.assets) {
      const newEvidence = result.assets.map(asset => asset.uri);
      setEvidence([...evidence, ...newEvidence]);
    }
  };

  const removeEvidence = (index) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case APPEAL_STATUS.SUBMITTED:
        return '#2196F3';
      case APPEAL_STATUS.UNDER_ADMIN_REVIEW:
      case APPEAL_STATUS.DOCUMENTED:
        return '#FF9800';
      case APPEAL_STATUS.WITH_DEPARTMENT:
      case APPEAL_STATUS.WITH_PRESIDENT:
        return '#9C27B0';
      case APPEAL_STATUS.APPROVED:
        return '#4CAF50';
      case APPEAL_STATUS.DISAPPROVED:
        return '#F44336';
      case APPEAL_STATUS.COMPLETED:
        return '#607D8B';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      [APPEAL_STATUS.SUBMITTED]: 'Submitted',
      [APPEAL_STATUS.UNDER_ADMIN_REVIEW]: 'Under Admin Review',
      [APPEAL_STATUS.DOCUMENTED]: 'Documented',
      [APPEAL_STATUS.WITH_DEPARTMENT]: 'With Department Head',
      [APPEAL_STATUS.WITH_PRESIDENT]: 'With President',
      [APPEAL_STATUS.APPROVED]: 'Approved',
      [APPEAL_STATUS.DISAPPROVED]: 'Disapproved',
      [APPEAL_STATUS.COMPLETED]: 'Completed'
    };
    return statusMap[status] || status;
  };

  const renderStageProgress = () => {
    if (!existingAppeal) return null;

    const stages = [
      { number: 1, label: 'Submitted', status: 'step1_submitted' },
      { number: 2, label: 'Admin Review', status: 'step2_adminReview' },
      { number: 3, label: 'Documented', status: 'step3_documented' },
      { number: 4, label: 'Forwarded', status: 'step4_forwardedToDept' },
      { number: 5, label: 'Dept Review', status: 'step5_deptReview' },
      { number: 6, label: 'President', status: 'step6_presidentDecision' },
      { number: 10, label: 'Completed', status: 'step10_completed' }
    ];

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Appeal Progress</Text>
        <Text style={styles.progressSubtitle}>
          Stage {existingAppeal.currentStage} of {existingAppeal.totalStages}
        </Text>
        
        {stages.map((stage, index) => {
          const isCompleted = existingAppeal.stages?.[stage.status];
          const isCurrent = existingAppeal.currentStage === stage.number;
          
          return (
            <View key={stage.number} style={styles.stageRow}>
              <View style={[
                styles.stageCircle,
                isCompleted && styles.stageCircleCompleted,
                isCurrent && styles.stageCircleCurrent
              ]}>
                <Text style={[
                  styles.stageNumber,
                  (isCompleted || isCurrent) && styles.stageNumberActive
                ]}>
                  {stage.number}
                </Text>
              </View>
              
              <View style={styles.stageInfo}>
                <Text style={[
                  styles.stageLabel,
                  isCompleted && styles.stageLabelCompleted
                ]}>
                  {stage.label}
                </Text>
                {isCompleted && existingAppeal.stages[stage.status] && (
                  <Text style={styles.stageDate}>
                    {new Date(existingAppeal.stages[stage.status]).toLocaleDateString()}
                  </Text>
                )}
              </View>
              
              {isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>
          );
        })}
      </View>
    );
  };

  // If appeal already exists, show status
  if (existingAppeal) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Appeal Status</Text>
          <Text style={styles.reportTitle}>{reportTitle}</Text>
        </View>

        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(existingAppeal.status) }
        ]}>
          <Text style={styles.statusText}>
            {getStatusText(existingAppeal.status)}
          </Text>
        </View>

        {renderStageProgress()}

        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Your Appeal Reason</Text>
          <Text style={styles.reasonText}>{existingAppeal.reason}</Text>

          <Text style={styles.sectionTitle}>Timeline</Text>
          <Text style={styles.infoText}>
            Submitted: {new Date(existingAppeal.submittedAt).toLocaleString()}
          </Text>
          {existingAppeal.deadline && (
            <Text style={styles.infoText}>
              Expected completion: {new Date(existingAppeal.deadline).toLocaleDateString()}
            </Text>
          )}

          {existingAppeal.finalDecision && (
            <>
              <Text style={styles.sectionTitle}>Final Decision</Text>
              <Text style={styles.decisionText}>{existingAppeal.finalDecision}</Text>
            </>
          )}

          <View style={styles.isoInfo}>
            <Text style={styles.isoText}>
              ℹ️ This appeal follows ISO 21001:2018 standards
            </Text>
            <Text style={styles.isoText}>
              Reference: MO-4.16 Handling Complaint's Appeals
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Reports</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Show appeal submission form
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Submit Appeal</Text>
        <Text style={styles.reportTitle}>{reportTitle}</Text>
      </View>

      <View style={styles.isoInfo}>
        <Text style={styles.isoText}>
          📋 ISO 21001:2018 Compliant Process
        </Text>
        <Text style={styles.isoSubtext}>
          Your appeal will be reviewed according to international education standards (MO-4.16)
        </Text>
      </View>

      <View style={styles.processInfo}>
        <Text style={styles.processTitle}>Appeal Review Process:</Text>
        <Text style={styles.processStep}>1. Admin Review (1 hour)</Text>
        <Text style={styles.processStep}>2. Documentation (1 hour)</Text>
        <Text style={styles.processStep}>3. Department Head Review (3 days)</Text>
        <Text style={styles.processStep}>4. President Decision (5 days)</Text>
        <Text style={styles.processStep}>5. Final Notification (1 day)</Text>
        <Text style={styles.processTotal}>Total: Up to 10 days</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>
          Reason for Appeal <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.helperText}>
          Explain why you believe the decision should be reconsidered (minimum 50 characters)
        </Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={8}
          value={reason}
          onChangeText={setReason}
          placeholder="Provide a detailed explanation for your appeal..."
          placeholderTextColor="#999"
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {reason.length} / 50 minimum characters
        </Text>

        <Text style={styles.label}>Additional Evidence (Optional)</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.uploadButtonText}>📎 Add Supporting Documents/Images</Text>
        </TouchableOpacity>

        {evidence.length > 0 && (
          <View style={styles.evidenceList}>
            {evidence.map((uri, index) => (
              <View key={index} style={styles.evidenceItem}>
                <Text style={styles.evidenceName}>Evidence {index + 1}</Text>
                <TouchableOpacity onPress={() => removeEvidence(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitAppeal}
          disabled={loading || reason.trim().length < 50}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Appeal</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#2667ff',
    padding: 20,
    paddingTop: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  reportTitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9
  },
  isoInfo: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  isoText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    marginBottom: 4
  },
  isoSubtext: {
    fontSize: 12,
    color: '#555',
    marginTop: 4
  },
  processInfo: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2
  },
  processTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  processStep: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginBottom: 6
  },
  processTotal: {
    fontSize: 14,
    color: '#2667ff',
    fontWeight: '600',
    marginTop: 8,
    marginLeft: 8
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  required: {
    color: '#F44336'
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 150,
    backgroundColor: '#fafafa'
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#2667ff',
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    marginTop: 8
  },
  uploadButtonText: {
    color: '#2667ff',
    fontSize: 14,
    fontWeight: '600'
  },
  evidenceList: {
    marginTop: 12
  },
  evidenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8
  },
  evidenceName: {
    fontSize: 14,
    color: '#333'
  },
  removeText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600'
  },
  actionContainer: {
    padding: 16
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc'
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  statusBadge: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  stageCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stageCircleCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  stageCircleCurrent: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  stageNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999'
  },
  stageNumberActive: {
    color: '#fff'
  },
  stageInfo: {
    flex: 1,
    marginLeft: 12
  },
  stageLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600'
  },
  stageLabelCompleted: {
    color: '#333'
  },
  stageDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  checkmark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  detailsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  decisionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8
  },
  backButton: {
    backgroundColor: '#2667ff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default AppealScreen;
