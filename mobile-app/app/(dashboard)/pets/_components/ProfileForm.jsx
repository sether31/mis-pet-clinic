import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppText from '../../../../components/AppText';
import AppButton from '../../../../components/AppButton';
import AnimatedWrapper from '../../../../components/AnimatedWrapper';
import { Colors } from '../../../../constants/Color';
import { displayDate } from '../../../../utils/dateFormatter';

const MAX_MEDICAL_LENGTH = 200;
const COMMON_SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];

export default function ProfileForm({ 
  form, setForm, isEditing, errors, validateField, 
  showDatePicker, setShowDatePicker, onDateChange, onSave, saving 
}) {

  // Local state to handle the "Other" text input if needed
  const [customSpecies, setCustomSpecies] = useState('');
  
  // Figure out which chip should be active based on the current form.species
  const activeSpeciesChip = COMMON_SPECIES.includes(form?.species) 
    ? form?.species 
    : (form?.species ? 'Other' : '');

  // Initialize custom species input if it's an unlisted species
  useEffect(() => {
    if (form?.species && !COMMON_SPECIES.includes(form.species) && form.species !== 'Other') {
      setCustomSpecies(form.species);
    }
  }, []);

  const handleSpeciesSelect = (s) => {
    if (s === 'Other') {
      // If they click Other, clear the main species until they type in the custom box
      setForm({...form, species: customSpecies || 'Other'});
    } else {
      setForm({...form, species: s}); 
      validateField('species', s);
    }
  };

  const handleCustomSpeciesChange = (t) => {
    setCustomSpecies(t);
    setForm({...form, species: t});
    validateField('species', t);
  };

  return (
    <View style={styles.formContainer}>
      <AnimatedWrapper index={1} style={styles.inputGroup}>
        <AppText style={styles.label}>Pet Name {isEditing && <AppText style={{color: '#EF4444'}}>*</AppText>}</AppText>
        <View style={[styles.inputWrapper, isEditing && styles.inputWrapperActive, errors.name && styles.inputErrorBorder]}>
          <Ionicons name="paw-outline" size={20} color={errors.name ? '#EF4444' : (isEditing ? Colors.primary : "#9CA3AF")} style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            value={form?.name} 
            editable={isEditing} 
            onChangeText={(t) => { setForm({...form, name: t}); validateField('name', t); }} 
          />
        </View>
        {errors.name && isEditing && <AppText style={styles.errorText}>{errors.name}</AppText>}
      </AnimatedWrapper>

      {/* 💥 SPECIES SECTION 💥 */}
      <AnimatedWrapper index={1.5} style={styles.inputGroup}>
        <AppText style={styles.label}>Species {isEditing && <AppText style={{color: '#EF4444'}}>*</AppText>}</AppText>
        
        {isEditing ? (
          <>
            {/* The Horizontal Chip Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
              {COMMON_SPECIES.map((s) => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.chip, activeSpeciesChip === s && styles.chipActive]}
                  onPress={() => handleSpeciesSelect(s)}
                >
                  <AppText style={[styles.chipText, activeSpeciesChip === s && styles.chipTextActive]}>{s}</AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* The Custom Input Box (Only shows if "Other" is selected) */}
            {activeSpeciesChip === 'Other' && (
              <View style={[styles.inputWrapper, { marginTop: 12 }, isEditing && styles.inputWrapperActive, errors.species && styles.inputErrorBorder]}>
                <Ionicons name="pencil-outline" size={20} color={errors.species ? '#EF4444' : Colors.primary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Type species..." 
                  maxLength={30}
                  value={customSpecies}
                  onChangeText={handleCustomSpeciesChange}
                />
              </View>
            )}
            {errors.species && <AppText style={styles.errorText}>{errors.species}</AppText>}
          </>
        ) : (
          // Read-Only View
          <View style={styles.inputWrapper}>
            <Ionicons name="list-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput style={styles.input} value={form?.species || 'N/A'} editable={false} />
          </View>
        )}
      </AnimatedWrapper>

      <AnimatedWrapper index={2} style={styles.inputGroup}>
        <AppText style={styles.label}>Breed</AppText>
        <View style={styles.inputWrapper}>
          {isEditing ? (
            <TextInput 
              value={form.breed}
              onChangeText={(val) => {
                setForm({...form, breed: val});
                validateField('breed', val);
              }}
              placeholder="Enter breed"
            />
          ) : (
            // If NOT editing, show N/A if it's empty
            <AppText style={styles.displayValue}>
              {form.breed && form.breed.trim() !== "" ? form.breed : 'N/A'}
            </AppText>
          )}
        </View>
      </AnimatedWrapper>

      <AnimatedWrapper index={3} style={styles.inputGroup}>
        <AppText style={styles.label}>Sex {isEditing && <AppText style={{color: '#EF4444'}}>*</AppText>}</AppText>
        {isEditing ? (
          <>
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.sexBtn, form?.sex?.toLowerCase() === 'male' && styles.sexBtnActive]} 
                onPress={() => { setForm({...form, sex: 'Male'}); validateField('sex', 'Male'); }}
              >
                <Ionicons name="male" size={20} color={form?.sex?.toLowerCase() === 'male' ? Colors.primary : '#9CA3AF'} />
                <AppText style={[styles.sexText, form?.sex?.toLowerCase() === 'male' && styles.sexTextActive]}>Male</AppText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sexBtn, form?.sex?.toLowerCase() === 'female' && styles.sexBtnActive]} 
                onPress={() => { setForm({...form, sex: 'Female'}); validateField('sex', 'Female'); }}
              >
                <Ionicons name="female" size={20} color={form?.sex?.toLowerCase() === 'female' ? Colors.primary : '#9CA3AF'} />
                <AppText style={[styles.sexText, form?.sex?.toLowerCase() === 'female' && styles.sexTextActive]}>Female</AppText>
              </TouchableOpacity>
            </View>
            {errors.sex && <AppText style={styles.errorText}>{errors.sex}</AppText>}
          </>
        ) : (
          <View style={styles.inputWrapper}>
            <Ionicons name={form?.sex?.toLowerCase() === 'male' ? "male-outline" : "female-outline"} size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput style={[styles.input, {textTransform: 'capitalize'}]} value={form?.sex || 'N/A'} editable={false} />
          </View>
        )}
      </AnimatedWrapper>

      <View style={styles.row}>
          <AnimatedWrapper index={4} style={[styles.inputGroup, { flex: 1 }]}>
            <AppText style={styles.label}>Weight</AppText>
            <View style={[styles.inputWrapper, isEditing && styles.inputWrapperActive]}>
              <Ionicons name="scale-outline" size={20} color={isEditing ? Colors.primary : "#9CA3AF"} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={form?.weight ? form.weight.toString() : ''} 
                keyboardType="decimal-pad" 
                editable={isEditing} 
                placeholder={isEditing ? "ex. 15" : "N/A"} 
                onChangeText={(t) => setForm({...form, weight: t.replace(/[^0-9.]/g, '')})} 
              />
              <AppText style={{ color: isEditing ? '#6B7280' : '#9CA3AF', fontWeight: '600' }}>kg</AppText>
            </View>
          </AnimatedWrapper>

          <AnimatedWrapper index={5} style={[styles.inputGroup, { flex: 1.2 }]}>
            <AppText style={styles.label}>Birthdate {isEditing && <AppText style={{color: '#EF4444'}}>*</AppText>}</AppText>
            <TouchableOpacity 
              style={[styles.inputWrapper, isEditing && styles.inputWrapperActive, errors.birthdate && styles.inputErrorBorder]} 
              disabled={!isEditing} 
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={errors.birthdate ? '#EF4444' : (isEditing ? Colors.primary : "#9CA3AF")} style={styles.inputIcon} />
              <AppText style={styles.input}>{form.birthdate && !form.birthdate.startsWith('0000') 
        ? displayDate(form.birthdate) 
        : 'N/A'}</AppText>
            </TouchableOpacity>
            {errors.birthdate && isEditing && <AppText style={styles.errorText}>{errors.birthdate}</AppText>}
            {showDatePicker && isEditing && (
              <DateTimePicker 
                value={form.birthdate && !form.birthdate.startsWith('0000') ? new Date(form.birthdate) : new Date()} 
                mode="date" 
                display="default" 
                maximumDate={new Date()} 
                onChange={onDateChange} 
              />
            )}
          </AnimatedWrapper>
      </View>

      <AnimatedWrapper index={6} style={styles.inputGroup}>
        <AppText style={styles.label}>Medical Conditions & Allergies</AppText>
        <View style={[styles.textAreaWrapper, isEditing && styles.inputWrapperActive]}>
          <TextInput 
            style={styles.textArea} 
            value={form?.medical_conditions} 
            multiline 
            editable={isEditing} 
            maxLength={MAX_MEDICAL_LENGTH} 
            onChangeText={(t) => setForm({...form, medical_conditions: t})} 
            placeholder={isEditing ? "Add conditions..." : "No recorded medical conditions."} 
          />
        </View>
        {isEditing && (
          <View style={styles.helperRow}>
            <View style={{ flex: 1 }} />
            <AppText style={[styles.charCounter, (form?.medical_conditions?.length || 0) === MAX_MEDICAL_LENGTH && { color: '#EF4444' }]}>
              {form?.medical_conditions?.length || 0}/{MAX_MEDICAL_LENGTH}
            </AppText>
          </View>
        )}
      </AnimatedWrapper>

      {isEditing && (
        <AnimatedWrapper index={7} style={{ marginTop: 10 }}>
          <AppButton title="Save Changes" onPress={onSave} loading={saving} />
        </AnimatedWrapper>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: { paddingHorizontal: 28, marginTop: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4, color: '#374151' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 54 },
  inputWrapperActive: { borderColor: Colors.primary, backgroundColor: '#F9FAFB' }, 
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 }, 
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 4 }, 
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '500' },
  
  chipContainer: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF',
    borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', marginRight: 8
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  chipTextActive: { color: '#FFF' },

  row: { flexDirection: 'row', gap: 12 },
  sexBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  sexBtnActive: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.primary + '10' },
  sexText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  sexTextActive: { color: Colors.primary },
  textAreaWrapper: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 12, minHeight: 100 },
  textArea: { flex: 1, fontSize: 15, color: '#111827', textAlignVertical: 'top', lineHeight: 22 },
  helperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 6, paddingHorizontal: 4 },
  charCounter: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
});