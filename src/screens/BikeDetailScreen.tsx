import { type ReactNode } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BikeDetail, ServiceRecord } from '@samishan11/moto-contract';
import { Button } from '../components/ui';
import { Card, EmptyState, Header, Loading } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useBike } from '../api/queries';
import {
  useAddBikePhoto,
  useDeleteBike,
  useDeleteBikePhoto,
  useDeleteServiceRecord,
} from '../garage/hooks';
import { pickImage } from '../lib/imagePicker';
import { fromIsoDate } from '../lib/date';
import { colors, spacing } from '../theme';

export function BikeDetailScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const id = typeof nav.params.id === 'string' ? nav.params.id : '';
  const bike = useBike(id);

  return (
    <View style={styles.flex}>
      <Header
        title={bike.data ? `${bike.data.brand} ${bike.data.model}` : t('garage.title')}
        right={
          bike.data ? (
            <Button
              title={t('common.edit')}
              variant="link"
              onPress={() => nav.navigate('bikeForm', { id })}
            />
          ) : undefined
        }
      />
      {bike.data ? <Detail bike={bike.data} /> : <Loading />}
    </View>
  );
}

function Detail({ bike }: { bike: BikeDetail }): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const addPhoto = useAddBikePhoto();
  const deletePhoto = useDeleteBikePhoto();
  const deleteBike = useDeleteBike();
  const deleteRecord = useDeleteServiceRecord();

  async function onAddPhoto(): Promise<void> {
    const file = await pickImage();
    if (file) addPhoto.mutate({ bikeId: bike.id, file: { uri: file.uri, contentType: file.contentType } });
  }

  function confirmDeletePhoto(photoId: string): void {
    Alert.alert(t('bikeDetail.deletePhotoTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deletePhoto.mutate({ bikeId: bike.id, photoId }),
      },
    ]);
  }

  function confirmDeleteRecord(record: ServiceRecord): void {
    Alert.alert(t('bikeDetail.deleteRecordTitle'), record.type, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteRecord.mutate({ bikeId: bike.id, recordId: record.id }),
      },
    ]);
  }

  function confirmDeleteBike(): void {
    Alert.alert(t('bikeDetail.deleteBikeTitle'), `${bike.brand} ${bike.model}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteBike.mutate(bike.id, { onSuccess: () => nav.goBack() }),
      },
    ]);
  }

  const specs: Array<[string, string | null]> = [
    [t('bikeForm.cc'), bike.cc != null ? `${bike.cc}` : null],
    [t('bikeForm.registrationNum'), bike.registrationNum],
    [t('bikeForm.vin'), bike.vin],
    [t('bikeForm.purchaseDate'), fromIsoDate(bike.purchaseDate) || null],
    [t('bikeForm.insuranceExpiry'), fromIsoDate(bike.insuranceExpiry) || null],
    [t('bikeForm.registrationExpiry'), fromIsoDate(bike.registrationExpiry) || null],
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* Photos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
        {bike.photos.map((p) => (
          <Pressable key={p.id} onLongPress={() => confirmDeletePhoto(p.id)}>
            <Image source={{ uri: p.url }} style={styles.photo} />
          </Pressable>
        ))}
        <Pressable style={styles.addPhoto} onPress={onAddPhoto} disabled={addPhoto.isPending}>
          <Text style={styles.addPhotoText}>{addPhoto.isPending ? '…' : '+'}</Text>
        </Pressable>
      </ScrollView>
      <Text style={styles.hint}>{t('bikeDetail.photoHint')}</Text>

      {/* Specs */}
      <Card>
        {specs
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <View key={label} style={styles.specRow}>
              <Text style={styles.specLabel}>{label}</Text>
              <Text style={styles.specValue}>{value}</Text>
            </View>
          ))}
      </Card>

      {/* Service records */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('service.title')}</Text>
        <Button
          title={t('service.add')}
          variant="link"
          onPress={() => nav.navigate('serviceRecordForm', { bikeId: bike.id })}
        />
      </View>
      {bike.serviceRecords.length === 0 ? <EmptyState message={t('service.empty')} /> : null}
      {bike.serviceRecords.map((r) => (
        <Card key={r.id}>
          <View style={styles.specRow}>
            <Text style={styles.recordType}>{r.type}</Text>
            <Text style={styles.recordDate}>{fromIsoDate(r.date)}</Text>
          </View>
          <Text style={styles.detail}>
            {[
              r.odometer != null ? `${r.odometer} km` : null,
              r.cost != null ? `${r.cost}` : null,
              r.workshop,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {r.notes ? <Text style={styles.detail}>{r.notes}</Text> : null}
          <View style={styles.actions}>
            {r.invoiceUrl ? (
              <Button
                title={t('service.viewInvoice')}
                variant="link"
                onPress={() => void Linking.openURL(r.invoiceUrl as string)}
              />
            ) : null}
            <Button
              title={t('common.edit')}
              variant="link"
              onPress={() =>
                nav.navigate('serviceRecordForm', { bikeId: bike.id, recordId: r.id })
              }
            />
            <Button
              title={t('common.delete')}
              variant="link"
              onPress={() => confirmDeleteRecord(r)}
            />
          </View>
        </Card>
      ))}

      <View style={styles.danger}>
        <Button title={t('bikeDetail.deleteBike')} onPress={confirmDeleteBike} loading={deleteBike.isPending} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing(2), gap: spacing(1.5) },
  photos: { gap: spacing(1), paddingRight: spacing(1) },
  photo: { width: 96, height: 96, borderRadius: 10, backgroundColor: colors.fieldBg },
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { fontSize: 36, color: colors.muted },
  hint: { fontSize: 12, color: colors.muted },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  specLabel: { fontSize: 14, color: colors.muted },
  specValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing(1),
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  recordType: { fontSize: 15, fontWeight: '600', color: colors.text },
  recordDate: { fontSize: 13, color: colors.muted },
  detail: { fontSize: 14, color: colors.muted },
  actions: { flexDirection: 'row', gap: spacing(1.5), flexWrap: 'wrap' },
  danger: { marginTop: spacing(2) },
});
