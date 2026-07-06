import { forwardRef, memo, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

/**
 * Production-grade auth input. Stability + Android-specific handling matter here
 * because the login/register forms re-render on every keystroke:
 *
 * - Defined at module scope + memoized → never remounts, so focus can't bounce.
 * - Focus ring is BORDER-ONLY (no elevation/shadow toggle) → avoids the Android
 *   repaint flicker that happens when a view's elevation changes on focus.
 * - Proper `autoComplete` / `textContentType` / `importantForAutofill` → stops
 *   the Android autofill service from re-measuring and stealing/switching focus.
 * - `blurOnSubmit={false}` + `onSubmitEditing` → moving to the next field keeps
 *   the keyboard open instead of dismissing/reopening (a common flicker source).
 */
export interface AuthFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Renders a show/hide toggle and manages secure entry internally. */
  isPassword?: boolean;
  rightSlot?: ReactNode;
}

export const AuthField = memo(
  forwardRef<TextInput, AuthFieldProps>(function AuthField(
    { label, isPassword, rightSlot, onFocus, onBlur, ...props },
    ref,
  ): ReactNode {
    const [focused, setFocused] = useState(false);
    const [reveal, setReveal] = useState(false);

    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.container, focused && styles.containerFocused]}>
          <TextInput
            ref={ref}
            style={styles.input}
            placeholderTextColor="#6B7280"
            autoCorrect={false}
            spellCheck={false}
            // Keep the keyboard up when advancing to the next field.
            blurOnSubmit={false}
            secureTextEntry={isPassword ? !reveal : props.secureTextEntry}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {isPassword ? (
            <Pressable onPress={() => setReveal((v) => !v)} hitSlop={10}>
              <Text style={styles.eye}>{reveal ? '🙈' : '👁'}</Text>
            </Pressable>
          ) : (
            rightSlot ?? null
          )}
        </View>
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9AA0AB',
    marginBottom: 8,
  },
  container: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  // Border-only focus state — no elevation/shadow (prevents Android flicker).
  containerFocused: { borderColor: 'rgba(255,90,31,0.6)' },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#F2F3F5',
    paddingVertical: 0, // avoid Android's default vertical padding jump
  },
  eye: { fontSize: 16, marginLeft: 8 },
});
