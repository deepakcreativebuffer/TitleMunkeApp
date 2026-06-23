import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import {appColors, typography, scaleWidth} from '../global';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <TouchableWithoutFeedback onPress={loading ? undefined : onCancel}>
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback>
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={loading}
                style={[styles.btn, styles.cancelBtn]}
                onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={loading}
                style={[
                  styles.btn,
                  danger ? styles.dangerBtn : styles.confirmBtn,
                ]}
                onPress={onConfirm}>
                {loading ? (
                  <ActivityIndicator color={appColors.white} />
                ) : (
                  <Text style={styles.confirmText}>{confirmLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,10,8,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(32),
  },
  card: {
    width: '100%',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(20),
    padding: scaleWidth(22),
  },
  title: {
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
  },
  message: {
    ...typography('regular', 14, 'gray'),
    marginTop: scaleWidth(8),
    lineHeight: scaleWidth(20),
  },
  actions: {
    flexDirection: 'row',
    marginTop: scaleWidth(22),
  },
  btn: {
    flex: 1,
    height: scaleWidth(48),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(61,32,20,0.06)',
    marginRight: scaleWidth(6),
  },
  confirmBtn: {
    backgroundColor: appColors.maroon,
    marginLeft: scaleWidth(6),
  },
  dangerBtn: {
    backgroundColor: appColors.error,
    marginLeft: scaleWidth(6),
  },
  cancelText: {
    ...typography(600, 15, 'coffeeDark'),
    fontWeight: '600',
  },
  confirmText: {
    ...typography(600, 15, 'white'),
    fontWeight: '600',
  },
});
