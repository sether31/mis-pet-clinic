import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// File System and Sharing
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Colors } from '../../../../constants/Color';
import { authFetch } from '../../../../utils/auth';
import { displayDate } from '../../../../utils/dateFormatter';
import AppText from '../../../../components/AppText';
import AnimatedWrapper from '../../../../components/AnimatedWrapper';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const NO_IMAGE = require('../../../../assets/images/no-image.jpg'); 

export default function MedicalRecordDetail() {
  const router = useRouter();
  const { recordId, from } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [downloading, setDownloading] = useState(false); 
  const [billModalVisible, setBillModalVisible] = useState(false);

  useEffect(() => {
    if (recordId) fetchRecordDetails();
  }, [recordId]);

  const fetchRecordDetails = async () => {
    try {
      const data = await authFetch(`${API_URL}/api/pet-owner/pet/get-medical-record-details.php?record_id=${recordId}`);
      if (data?.success) {
        setRecord(data.data);
      } else {
        Toast.show({ type: 'error', text1: 'Something went wrong' });
        router.back();
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const getMediaUrl = (path) => {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http')) return path; 
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_URL}/${cleanPath}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBA';
    try {
      const [hour, minute] = timeString.split(':');
      const h = parseInt(hour, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedHour = h % 12 || 12;
      return `${formattedHour}:${minute} ${ampm}`;
    } catch(e) { return timeString; }
  };

  const handleDownload = async (filePath, displayType) => {
    if (downloading) return;
    const url = getMediaUrl(filePath);
    if (!url) return;

    setDownloading(true);
    Toast.show({ type: 'info', text1: `Preparing ${displayType}...` });

    try {
      const filename = filePath.split('/').pop() || `download.${displayType === 'Image' ? 'jpg' : 'pdf'}`;
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_'); 
      const mimeType = displayType === 'Image' ? 'image/jpeg' : 'application/pdf';

      // 1. Download to temporary cache
      const tempLocalUri = FileSystem.documentDirectory + cleanFilename;
      const { uri, status } = await FileSystem.downloadAsync(url, tempLocalUri);

      if (status !== 200) throw new Error("Failed to fetch file from server");

      const base64Data = await FileSystem.readAsStringAsync(uri, { 
        encoding: FileSystem.EncodingType.Base64 
      });

      // 2. Check SecureStore for a saved folder permission from a previous download
      let savedFolderUri = await SecureStore.getItemAsync('savedDownloadFolder');
      let fileSavedSilently = false;

      if (savedFolderUri) {
        try {
          // Try to save it silently to the remembered folder!
          const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
            savedFolderUri, 
            cleanFilename, 
            mimeType
          );
          await FileSystem.writeAsStringAsync(targetUri, base64Data, { 
            encoding: FileSystem.EncodingType.Base64 
          });
          
          fileSavedSilently = true;
          Toast.show({ type: 'success', text1: 'Downloaded successfully!' });
        } catch(e) {
          console.log("Something went wrong");
        }
      }

      // 3. If it's their first time (or silent save failed), ask them to pick a folder
      if (!fileSavedSilently) {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
          // REMEMBER this folder choice in SecureStore for NEXT time!
          await SecureStore.setItemAsync('savedDownloadFolder', permissions.directoryUri);

          // Save the file
          const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri, 
            cleanFilename, 
            mimeType
          );
          await FileSystem.writeAsStringAsync(targetUri, base64Data, { 
            encoding: FileSystem.EncodingType.Base64 
          });
          
          Toast.show({ type: 'success', text1: 'Downloaded successfully!' });
        } else {
          Toast.show({ type: 'info', text1: 'Something went wrong' });
        }
      }

    } catch (error) {
      console.error("Download Error:", error);
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setDownloading(false);
    }
  };

  const handleBack = () => {
    if(from === 'activity') {
      router.push('/activity'); 
    } else {
      router.back();
    }
  };

  const formatRecordType = (type) => {
    if (!type) return 'MEDICAL RECORD';
    if(type === "unset") return 'UNRECORDED';
    return type.replace(/_/g, ' ').toUpperCase();
  };

  const getBadgeColor = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('non')) return '#6B7280'; 
    return Colors.primary; 
  };

  const goToClinicProfile = () => {
    if (!record?.branch_id) {
      Toast.show({ 
        type: 'error', 
        text1: 'Something went wrong' 
      });
      return;
    }

    if (
      record.is_maintenance == 1 || 
      record.clinic_status !== 'approved' || 
      record.has_active_sub == 0 
    ) {
      Toast.show({ 
        type: 'info', 
        text1: 'Clinic Unavailable', 
        text2: 'This clinic is currently under maintenance or unavailable.',
        visibilityTime: 4000 
      });
      return; 
    }

    router.push(`/clinics/${record.branch_id}`);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const hasAttachments = record?.med_image_1 || record?.med_image_2 || record?.med_doc_1 || record?.med_doc_2;
  const branchImageSource = getMediaUrl(record?.branch_image) ? { uri: getMediaUrl(record?.branch_image) } : NO_IMAGE;
  const vetImageSource = getMediaUrl(record?.vet_image) ? { uri: getMediaUrl(record?.vet_image) } : NO_IMAGE;

  const formatName = (str) => {
    if (!str) return "";
    // Capitalizes the first letter and makes the rest lowercase
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Visit Details</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Branch Banner */}
        <AnimatedWrapper index={0}>
          <View style={styles.bannerContainer}>
            <Image source={branchImageSource} style={styles.bannerImage} />
            <View style={styles.bannerOverlay} />
            <View style={[styles.badgeContainer, { backgroundColor: getBadgeColor(record?.record_type) }]}>
              <AppText style={styles.badgeText}>{formatRecordType(record?.record_type)}</AppText>
            </View>
          </View>
        </AnimatedWrapper>
        
        {/* Top Summary Card */}
        <AnimatedWrapper index={1} style={styles.topCard}>
          <AppText style={styles.serviceName}>{record?.service_name_at_time || "Vet Appointment"}</AppText>
          
          <View style={styles.scheduleBox}>
            <AppText style={styles.scheduleLabel}>Appointment Schedule</AppText>
            <View style={styles.dateRow}>
              <Ionicons name="calendar" size={16} color={Colors.primary} />
              <AppText style={styles.dateText}>{displayDate(record?.appointment_date || record?.record_date)}</AppText>
            </View>
            <View style={styles.dateRow}>
              <Ionicons name="time" size={16} color={Colors.primary} />
              <AppText style={styles.dateText}>
                {record?.start_time ? `${formatTime(record.start_time)} - ${formatTime(record.end_time)}` : "Time not recorded"}
              </AppText>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.providerSection}>
            <Image source={vetImageSource} style={styles.vetAvatar} />
            <View style={styles.providerInfo}>
              <AppText style={styles.vetName}>Dr. {record?.vet_first_name} {record?.vet_last_name}</AppText>
              
              {/* Clinic Profile Link */}
              <TouchableOpacity style={styles.clinicRow} onPress={goToClinicProfile} activeOpacity={0.6}>
                <Ionicons name="business-outline" size={14} color={Colors.primary} />
                <AppText style={styles.clinicName}>{record?.branch_name}</AppText>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} style={{marginLeft: 2}} />
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedWrapper>

        <View style={styles.detailsContainer}>
          
          {/* Diagnosis Card */}
          <AnimatedWrapper index={2} style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
                <Ionicons name="search-outline" size={18} color={Colors.primary} />
                <AppText style={styles.infoCardTitle}>Diagnosis</AppText>
            </View>
            <View style={styles.readOnlyBlock}>
              <AppText style={styles.readOnlyText}>{record?.diagnosis?.trim() ? record.diagnosis : "N/A"}</AppText>
            </View>
          </AnimatedWrapper>

          {/* Treatment Card */}
          <AnimatedWrapper index={3} style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
                <Ionicons name="medkit-outline" size={18} color={Colors.primary} />
                <AppText style={styles.infoCardTitle}>Treatment & Prescriptions</AppText>
            </View>
            <View style={styles.readOnlyBlock}>
              <AppText style={styles.readOnlyText}>{record?.treatment?.trim() ? record.treatment : "N/A"}</AppText>
            </View>
          </AnimatedWrapper>

          {/* Billing Action Card */}
          <AnimatedWrapper index={4}>
            <TouchableOpacity 
                style={styles.billingCard} 
                onPress={() => setBillModalVisible(true)}
                activeOpacity={0.7}
            >
                <View style={styles.billingLeft}>
                    <View style={styles.billingIconBg}><Ionicons name="receipt" size={20} color={Colors.primary} /></View>
                    <View>
                        <AppText style={styles.billingLabel}>Total Amount Paid</AppText>
                        <AppText style={styles.billingValue}>₱{parseFloat(record?.total_amount || 0).toFixed(2)}</AppText>
                    </View>
                </View>
                <View style={styles.viewDetailsBadge}>
                    <AppText style={styles.viewDetailsText}>View Bill</AppText>
                    <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </View>
            </TouchableOpacity>
          </AnimatedWrapper>

          {/* Attachments Card */}
          <AnimatedWrapper index={5} style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
                <Ionicons name="attach-outline" size={20} color={Colors.primary} />
                <AppText style={styles.infoCardTitle}>Attachments</AppText>
            </View>
            
            {!hasAttachments ? (
              <AppText style={styles.noAttachments}>No files or images attached.</AppText>
            ) : (
              <View style={styles.attachmentContent}>
                {(record?.med_image_1 || record?.med_image_2) && (
                  <View style={styles.imageGallery}>
                    {record?.med_image_1 && (
                      <TouchableOpacity style={styles.imageWrapper} activeOpacity={0.8} onPress={() => handleDownload(record.med_image_1, "Image")}>
                        <Image source={{ uri: getMediaUrl(record.med_image_1) }} style={styles.attachedImage} />
                        <View style={styles.imageDownloadOverlay}>
                            <Ionicons name="download-outline" size={18} color="#FFF" />
                        </View>
                      </TouchableOpacity>
                    )}
                    {record?.med_image_2 && (
                      <TouchableOpacity style={styles.imageWrapper} activeOpacity={0.8} onPress={() => handleDownload(record.med_image_2, "Image")}>
                        <Image source={{ uri: getMediaUrl(record.med_image_2) }} style={styles.attachedImage} />
                        <View style={styles.imageDownloadOverlay}>
                            <Ionicons name="download-outline" size={18} color="#FFF" />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                {record?.med_doc_1 && (
                  <TouchableOpacity style={styles.docRow} onPress={() => handleDownload(record.med_doc_1, "Document")}>
                    <Ionicons name="document-text" size={20} color="#6B7280" />
                    <AppText style={styles.docText}>Download Document 1</AppText>
                    <Ionicons name="download-outline" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
                {record?.med_doc_2 && (
                  <TouchableOpacity style={styles.docRow} onPress={() => handleDownload(record.med_doc_2, "Document")}>
                    <Ionicons name="document-text" size={20} color="#6B7280" />
                    <AppText style={styles.docText}>Download Document 2</AppText>
                    <Ionicons name="download-outline" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </AnimatedWrapper>

          <View style={styles.timestampContainer}>
            <AppText style={styles.timestampText}>Record created: {displayDate(record?.created_at)}</AppText>
            <AppText style={styles.timestampText}>Last updated: {displayDate(record?.updated_at)}</AppText>
          </View>
        </View>
      </ScrollView>

      {/* RECEIPT MODAL */}
      <Modal visible={billModalVisible} transparent animationType="slide" onRequestClose={() => setBillModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBillModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Receipt Detail</AppText>
              <Pressable onPress={() => setBillModalVisible(false)}>
                {({ pressed }) => (
                  <Ionicons 
                    name="close-circle" 
                    size={28} 
                    color={pressed ? 'red' : "#D1D5DB"} 
                  />
                )}
              </Pressable>
            </View>

            <View style={styles.receiptPaper}>
              <AppText style={styles.receiptClinicName}>{record?.branch_name}</AppText>
              <AppText style={styles.receiptSub}>Official Visit Receipt</AppText>
              <View style={styles.dashedLine} />

              {/* Main Service Row */}
              <View style={styles.receiptRow}>
                <AppText style={styles.receiptItemName}>{formatName(record?.service_name_at_time)}</AppText>
                <AppText style={styles.receiptItemPrice}>₱{parseFloat(record?.base_service_price || 0).toFixed(2)}</AppText>
              </View>

              {/* Additional Items: Filtered to remove the main service redundancy */}
              {record?.items?.filter(item => 
    item.item_name?.toLowerCase() !== record?.service_name_at_time?.toLowerCase()
).map((item, index) => (
    <View key={index} style={styles.receiptItemContainer}>
        <View style={styles.receiptRow}>
            <View style={{ flex: 1 }}>
                {/* Item Name (e.g., PARACETAMOL) */}
                <AppText style={styles.receiptItemName}>
                    {item.item_name?.toUpperCase()} (x{item.quantity})
                </AppText>

                {/* UNIT PRICE LINE (e.g., @ ₱222.00 each) */}
                <AppText style={styles.unitPriceText}>
                    @ ₱{parseFloat(item.price || 0).toFixed(2)} each
                </AppText>
                
                {/* SUB-DETAILS LINE: BRAND • GENERIC • DOSAGE */}
                {(item.brand_name || item.dosage || item.brand_type?.toLowerCase() === 'medicine') && (
                    <View style={styles.subDetailRow}>
                        {item.brand_name && (
                            <AppText style={styles.subDetailText}>
                                {item.brand_name.toUpperCase()}
                            </AppText>
                        )}

                        {item.brand_type?.toLowerCase() === 'medicine' && (
                            <>
                                {item.brand_name && <AppText style={styles.dotSeparator}> • </AppText>}
                                <AppText style={[styles.subDetailText, styles.genericText]}>
                                    GENERIC
                                </AppText>
                            </>
                        )}

                        {item.dosage && (
                            <>
                                {(item.brand_name || item.brand_type?.toLowerCase() === 'medicine') && (
                                    <AppText style={styles.dotSeparator}> • </AppText>
                                )}
                                <AppText style={[styles.subDetailText, styles.dosageBlueText]}>
                                    {item.dosage.toUpperCase()}
                                </AppText>
                            </>
                        )}
                    </View>
                )}
            </View>

            {/* Subtotal on the right */}
            <AppText style={styles.receiptItemPrice}>
                ₱{parseFloat(item.subtotal).toFixed(2)}
            </AppText>
        </View>
    </View>
))}

              <View style={styles.dashedLine} />
              <View style={styles.receiptTotalRow}>
                <AppText style={styles.receiptTotalLabel}>TOTAL</AppText>
                <AppText style={styles.receiptTotalValue}>₱{parseFloat(record?.total_amount || 0).toFixed(2)}</AppText>
              </View>
              <AppText style={styles.paymentNote}>Paid via {record?.payment_method || 'CASH'}</AppText>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: { paddingBottom: 60 },
  
  bannerContainer: { width: '100%', height: 160, position: 'relative' },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  badgeContainer: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  
  topCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, marginHorizontal: 20, marginTop: -40, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  serviceName: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 12 },
  scheduleBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  scheduleLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dateText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  providerSection: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vetAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6' },
  vetName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  clinicRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, paddingVertical: 4 },
  clinicName: { fontSize: 13, color: Colors.primary, fontWeight: '700', textTransform: 'capitalize' },

  detailsContainer: { paddingHorizontal: 20 },
  
  // Side-bordered card layout
  infoCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
  infoCardTitle: { fontSize: 14, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  readOnlyBlock: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12 },
  readOnlyText: { fontSize: 15, color: '#374151', lineHeight: 24 },
  
  billingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  billingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  billingIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  billingLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  billingValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  viewDetailsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  viewDetailsText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  noAttachments: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  attachmentContent: { marginTop: 4 },
  imageGallery: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  imageWrapper: { flex: 1, height: 140, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6' },
  attachedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageDownloadOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, marginBottom: 8 },
  docText: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '600' },

  timestampContainer: { marginTop: 10, marginBottom: 30, alignItems: 'center' },
  timestampText: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  receiptPaper: { backgroundColor: '#F8FAFC', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  receiptClinicName: { fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center' },
  receiptSub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  dashedLine: { height: 1, borderBottomWidth: 1, borderBottomColor: '#CBD5E1', borderStyle: 'dashed', marginVertical: 20 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  receiptTotalLabel: { fontSize: 16, fontWeight: '900', color: '#111827' },
  receiptTotalValue: { fontSize: 24, fontWeight: '900', color: Colors.primary },
  paymentNote: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 20, fontWeight: '700' },

  subDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  unitPriceText: {
    fontSize: 12,
    color: '#94A3B8',   // Light gray (Slate-400)
    marginTop: 2,
    fontWeight: '500',
  },
  subDetailText: {
    fontSize: 10,       // Keep it small
    color: '#94A3B8',   // Light slate/gray
    fontWeight: '800',  // Bold look like the image
  },
  genericText: {
    fontStyle: 'italic',
    color: '#64748B',   // Slightly darker gray for the italic part
  },
  dosageBlueText: {
    color: '#3B82F6',   // Bright Blue like your image
  },
  dotSeparator: {
    fontSize: 12,
    color: '#CBD5E1',
    paddingHorizontal: 4,
    fontWeight: '900',
  },
  receiptItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  receiptItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  receiptItemContainer: {
    marginBottom: 14,
    width: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  verticalDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  brandTypeBadge: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dosageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF', // Light blue background
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dosageText: {
    fontSize: 12,
    color: '#0369A1', // Dark blue text
    fontWeight: '600',
    flex: 1,
  },
});