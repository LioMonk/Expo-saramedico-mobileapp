// src/components/CustomComponents.js
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export const CustomInput = ({
  placeholder,
  isPassword,
  icon,
  value,
  onChangeText,
  error,
  autoComplete,
  textContentType,
  keyboardType,
  accessibilityLabel,
  accessibilityHint
}) => {
  const [showPass, setShowPass] = useState(false);
  return (
    <View>
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          secureTextEntry={isPassword && !showPass}
          placeholderTextColor={COLORS.placeholder}
          value={value}
          onChangeText={onChangeText}
          autoComplete={autoComplete}
          textContentType={textContentType}
          keyboardType={keyboardType}
          accessibilityLabel={accessibilityLabel || placeholder}
          accessibilityHint={accessibilityHint}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPass(!showPass)}
            style={styles.iconButton}
            accessibilityLabel={showPass ? "Hide password" : "Show password"}
            accessibilityRole="button"
          >
            <Ionicons name={showPass ? "eye-off" : "eye"} size={20} color={COLORS.placeholder} />
          </TouchableOpacity>
        )}
        {icon && <Ionicons name={icon} size={20} color={COLORS.placeholder} style={{ marginLeft: 10 }} />}
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

export const CustomButton = ({ title, onPress, type = 'PRIMARY', disabled = false }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        type === 'SECONDARY' ? styles.btnSecondary : styles.btnPrimary,
        disabled && { opacity: 0.5 }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={[styles.btnText, type === 'SECONDARY' ? styles.btnTextSec : styles.btnTextPri]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 5
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  input: { flex: 1, height: '100%', color: COLORS.text, fontSize: 16 },
  iconButton: {
    padding: 5,
    minWidth: 30,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
    marginLeft: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginLeft: 5,
  },
  button: { borderRadius: 30, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnSecondary: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#DDD' },
  btnText: { fontSize: 16, fontWeight: '600' },
  btnTextPri: { color: COLORS.white },
  btnTextSec: { color: '#333' },
});