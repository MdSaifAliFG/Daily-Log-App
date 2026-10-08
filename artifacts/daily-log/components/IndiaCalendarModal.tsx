import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { getIndianHoliday, getIndianHolidaysForMonth, IndianHoliday } from '@/lib/holidaysIndia';
import { iso } from '@/lib/date';

interface IndiaCalendarModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function IndiaCalendarModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}: IndiaCalendarModalProps) {
  const colors = useColors();

  // Current viewed month state
  const initialDate = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [selectedDate]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() + 1); // 1-12
  const [activeDate, setActiveDate] = useState(selectedDate || iso(new Date()));

  const todayStr = iso(new Date());

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
    setActiveDate(todayStr);
  };

  // Month data
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 is Sun

  const monthName = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
  });

  const monthHolidays = useMemo(() => {
    return getIndianHolidaysForMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  const selectedHoliday = useMemo(() => {
    return getIndianHoliday(activeDate);
  }, [activeDate]);

  const handlePickDate = (dateStr: string) => {
    setActiveDate(dateStr);
    onSelectDate(dateStr);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.dialog,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View>
              <View style={styles.titleBadgeRow}>
                <Text style={[styles.flagEmoji]}>🇮🇳</Text>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>Indian Live Calendar</Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                {monthName} {viewYear}
              </Text>
            </View>

            <View style={styles.navBtnRow}>
              <Pressable
                onPress={goToToday}
                style={[styles.todayBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Text style={[styles.todayBtnText, { color: colors.secondaryForeground }]}>Today</Text>
              </Pressable>
              <Pressable
                onPress={prevMonth}
                style={[styles.arrowBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                accessibilityLabel="Previous month"
              >
                <Feather name="chevron-left" size={18} color={colors.foreground} />
              </Pressable>
              <Pressable
                onPress={nextMonth}
                style={[styles.arrowBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                accessibilityLabel="Next month"
              >
                <Feather name="chevron-right" size={18} color={colors.foreground} />
              </Pressable>
              <Pressable
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                accessibilityLabel="Close calendar"
              >
                <Feather name="x" size={16} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Weekday Labels */}
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((wd, idx) => (
                <Text
                  key={wd}
                  style={[
                    styles.weekdayText,
                    {
                      color: idx === 0 ? '#D9534F' : colors.mutedForeground,
                    },
                  ]}
                >
                  {wd}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.daysGrid}>
              {/* Padding blanks for first day of week */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.dayCellBlank} />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = dateStr === activeDate;
                const isToday = dateStr === todayStr;
                const holiday = getIndianHoliday(dateStr);

                return (
                  <Pressable
                    key={dateStr}
                    style={({ pressed }) => [
                      styles.dayCell,
                      isSelected && {
                        backgroundColor: colors.primary,
                      },
                      !isSelected && isToday && {
                        borderColor: colors.primary,
                        borderWidth: 1.5,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handlePickDate(dateStr)}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        {
                          color: isSelected
                            ? colors.primaryForeground
                            : isToday
                            ? colors.primary
                            : colors.foreground,
                          fontWeight: isSelected || isToday ? '700' : '500',
                        },
                      ]}
                    >
                      {dayNum}
                    </Text>

                    {holiday && (
                      <View style={styles.holidayBadgeWrap}>
                        <Text style={styles.holidayEmojiSmall}>{holiday.emoji}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Selected Date & Holiday Information */}
            {selectedHoliday && (
              <View style={[styles.holidayAlert, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <View style={styles.holidayAlertHeader}>
                  <Text style={styles.holidayEmojiBig}>{selectedHoliday.emoji}</Text>
                  <View style={styles.flexOne}>
                    <View style={styles.holidayTagRow}>
                      <Text style={[styles.holidayName, { color: colors.foreground }]}>
                        {selectedHoliday.name}
                      </Text>
                      <View style={[styles.holidayTypeTag, { backgroundColor: colors.card }]}>
                        <Text style={[styles.holidayTypeTagText, { color: colors.primary }]}>
                          {selectedHoliday.type} Holiday
                        </Text>
                      </View>
                    </View>
                    {selectedHoliday.description && (
                      <Text style={[styles.holidayDesc, { color: colors.mutedForeground }]}>
                        {selectedHoliday.description}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Holidays this month list */}
            <View style={styles.monthHolidaysSection}>
              <View style={styles.sectionTitleRow}>
                <Feather name="calendar" size={14} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Indian Holidays in {monthName} ({monthHolidays.length})
                </Text>
              </View>

              {monthHolidays.length === 0 ? (
                <Text style={[styles.noHolidaysText, { color: colors.mutedForeground }]}>
                  No major gazetted holidays this month.
                </Text>
              ) : (
                monthHolidays.map((hol) => {
                  const dayParts = hol.date.split('-');
                  const dayNum = Number(dayParts[2]);
                  const isCurrentSelection = hol.date === activeDate;

                  return (
                    <Pressable
                      key={hol.date}
                      style={({ pressed }) => [
                        styles.holidayListItem,
                        {
                          backgroundColor: isCurrentSelection ? colors.secondary : colors.background,
                          borderColor: colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                      onPress={() => handlePickDate(hol.date)}
                    >
                      <Text style={styles.holidayListEmoji}>{hol.emoji}</Text>
                      <View style={styles.flexOne}>
                        <Text style={[styles.holidayListTitle, { color: colors.foreground }]}>
                          {hol.name}
                        </Text>
                        <Text style={[styles.holidayListDate, { color: colors.mutedForeground }]}>
                          {monthName} {dayNum} · {hol.type} Holiday
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
                    </Pressable>
                  );
                })
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 20, 18, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  flagEmoji: {
    fontSize: 14,
  },
  eyebrow: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 20,
    fontWeight: '700',
  },
  navBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  todayBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    fontWeight: '700',
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  scrollArea: {
    padding: 20,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekdayText: {
    fontFamily: 'Amazon Ember Display',
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCellBlank: {
    width: '14.28%',
    height: 44,
  },
  dayCell: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    position: 'relative',
    marginVertical: 2,
  },
  dayNumberText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 14,
  },
  holidayBadgeWrap: {
    position: 'absolute',
    bottom: 2,
  },
  holidayEmojiSmall: {
    fontSize: 10,
  },
  holidayAlert: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  holidayAlertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  holidayEmojiBig: {
    fontSize: 24,
  },
  flexOne: {
    flex: 1,
  },
  holidayTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  holidayName: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 15,
    fontWeight: '700',
  },
  holidayTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  holidayTypeTagText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 10,
    fontWeight: '700',
  },
  holidayDesc: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    lineHeight: 16,
  },
  monthHolidaysSection: {
    marginTop: 4,
    paddingBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 13,
    fontWeight: '700',
  },
  noHolidaysText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  holidayListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  holidayListEmoji: {
    fontSize: 20,
  },
  holidayListTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 13,
    fontWeight: '600',
  },
  holidayListDate: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    marginTop: 2,
  },
});
