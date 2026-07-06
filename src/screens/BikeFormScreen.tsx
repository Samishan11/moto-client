import { useState, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import type { Bike, CreateBikeRequest } from '@moto/contract';
import { Button, Field, FormError } from '../components/ui';
import { DateField } from '../components/DateField';
import { Header, Loading, Page } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useBike } from '../api/queries';
import { useCreateBike, useUpdateBike } from '../garage/hooks';
import { errorMessage } from '../api/errorMessage';
import { colors, spacing } from '../theme';

export function BikeFormScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const editId = typeof nav.params.id === 'string' ? nav.params.id : null;
  const existing = useBike(editId ?? '');

  const title = editId ? t('bikeForm.editTitle') : t('bikeForm.addTitle');

  return (
    <View style={styles.flex}>
      <Header title={title} />
      {editId && !existing.data ? <Loading /> : <Form bike={editId ? existing.data : undefined} />}
    </View>
  );
}

/** The design system's bike glyph (garage/login hero), on the primary gradient. */
function BikeHero({ title, subtitle }: { title: string; subtitle: string }): ReactNode {
  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={['#FF5A1F', '#E8410C']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.heroTile}
      >
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
          <Circle cx={5.5} cy={17} r={3.2} stroke="#fff" strokeWidth={1.6} />
          <Circle cx={18.5} cy={17} r={3.2} stroke="#fff" strokeWidth={1.6} />
          <Path
            d="M8.5 17h6l2-5h-9m1 5l-2-5H4m10 0l1.5-3H18"
            stroke="#fff"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </LinearGradient>
      <View style={styles.heroText}>
        <Text style={styles.heroTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.heroSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: string }): ReactNode {
  return <Text style={styles.section}>{children.toUpperCase()}</Text>;
}

function Form({ bike }: { bike?: Bike }): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const create = useCreateBike();
  const update = useUpdateBike();

  const [brand, setBrand] = useState(bike?.brand ?? '');
  const [model, setModel] = useState(bike?.model ?? '');
  const [cc, setCc] = useState(bike?.cc != null ? String(bike.cc) : '');
  const [registrationNum, setRegistrationNum] = useState(bike?.registrationNum ?? '');
  const [vin, setVin] = useState(bike?.vin ?? '');
  const [purchaseDate, setPurchaseDate] = useState<string | null>(bike?.purchaseDate ?? null);
  const [insuranceExpiry, setInsuranceExpiry] = useState<string | null>(
    bike?.insuranceExpiry ?? null,
  );
  const [registrationExpiry, setRegistrationExpiry] = useState<string | null>(
    bike?.registrationExpiry ?? null,
  );
  const [fieldErrors, setFieldErrors] = useState<{ brand?: string; model?: string }>({});

  // Live hero: the form header becomes the bike as the rider types.
  const heroTitle =
    [brand.trim(), model.trim()].filter(Boolean).join(' ') || t('bikeForm.heroPlaceholder');
  const heroSub = cc.trim() ? `${cc.trim()} cc` : t('bikeForm.subtitle');

  function onSubmit(): void {
    const errors: { brand?: string; model?: string } = {};
    if (brand.trim().length === 0) errors.brand = t('common.required');
    if (model.trim().length === 0) errors.model = t('common.required');
    setFieldErrors(errors);
    if (errors.brand || errors.model) return;

    const body: CreateBikeRequest = {
      brand: brand.trim(),
      model: model.trim(),
      cc: cc.trim() === '' ? null : Number(cc),
      registrationNum: registrationNum.trim() || null,
      vin: vin.trim() || null,
      purchaseDate,
      insuranceExpiry,
      registrationExpiry,
    };
    const opts = { onSuccess: () => nav.goBack() };
    if (bike) update.mutate({ id: bike.id, body }, opts);
    else create.mutate(body, opts);
  }

  const mutationError = create.error ?? update.error ?? null;

  return (
    <Page>
      <BikeHero title={heroTitle} subtitle={heroSub} />

      <SectionLabel>{t('bikeForm.sectionBike')}</SectionLabel>
      <View style={styles.rowFields}>
        <View style={styles.rowField}>
          <Field
            label={t('bikeForm.brand')}
            value={brand}
            onChangeText={(v) => {
              setBrand(v);
              if (fieldErrors.brand) setFieldErrors((e) => ({ ...e, brand: undefined }));
            }}
            placeholder={t('bikeForm.brandPh')}
            autoCapitalize="words"
            error={fieldErrors.brand}
          />
        </View>
        <View style={styles.rowField}>
          <Field
            label={t('bikeForm.model')}
            value={model}
            onChangeText={(v) => {
              setModel(v);
              if (fieldErrors.model) setFieldErrors((e) => ({ ...e, model: undefined }));
            }}
            placeholder={t('bikeForm.modelPh')}
            autoCapitalize="words"
            error={fieldErrors.model}
          />
        </View>
      </View>
      <Field
        label={t('bikeForm.cc')}
        value={cc}
        onChangeText={(v) => setCc(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder={t('bikeForm.ccPh')}
        maxLength={5}
        optional
      />

      <SectionLabel>{t('bikeForm.sectionPapers')}</SectionLabel>
      <Field
        label={t('bikeForm.registrationNum')}
        value={registrationNum}
        onChangeText={setRegistrationNum}
        autoCapitalize="characters"
        placeholder={t('bikeForm.registrationPh')}
        optional
      />
      <Field
        label={t('bikeForm.vin')}
        value={vin}
        onChangeText={setVin}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={17}
        hint={t('bikeForm.vinHint')}
        optional
      />
      <DateField
        label={t('bikeForm.purchaseDate')}
        value={purchaseDate}
        onChange={setPurchaseDate}
        optional
      />
      <DateField
        label={t('bikeForm.insuranceExpiry')}
        value={insuranceExpiry}
        onChange={setInsuranceExpiry}
        optional
      />
      <DateField
        label={t('bikeForm.registrationExpiry')}
        value={registrationExpiry}
        onChange={setRegistrationExpiry}
        optional
      />

      <View style={styles.footer}>
        <FormError message={mutationError ? errorMessage(mutationError, t) : null} />
        <Button
          title={bike ? t('common.save') : t('bikeForm.create')}
          onPress={onSubmit}
          loading={create.isPending || update.isPending}
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    padding: spacing(2),
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    marginBottom: spacing(1),
  },
  heroTile: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  heroSub: { fontSize: 13, fontWeight: '500', color: colors.muted, marginTop: 3 },

  section: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.96, // .08em at 12px, per the design file
    color: colors.faint,
    marginTop: spacing(1.5),
  },

  rowFields: { flexDirection: 'row', gap: spacing(1.5) },
  rowField: { flex: 1 },

  footer: { marginTop: spacing(2), gap: spacing(1) },
});
