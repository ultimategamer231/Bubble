package com.corexlr.focusbubble.focusnative

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Plain JUnit tests for the pure rules in this module. No device or emulator needed. */
class FocusNativeLogicTest {
  // ── Sound / vibration gating (QA: "Phone on silent / DND → no sound") ──

  @Test
  fun sound_plays_only_when_enabled_ringing_and_dnd_off() {
    assertTrue(AlertGate.shouldPlaySound(true, AlertGate.RINGER_NORMAL, AlertGate.FILTER_ALL))
    assertFalse(AlertGate.shouldPlaySound(false, AlertGate.RINGER_NORMAL, AlertGate.FILTER_ALL))
    assertFalse(AlertGate.shouldPlaySound(true, AlertGate.RINGER_SILENT, AlertGate.FILTER_ALL))
    assertFalse(AlertGate.shouldPlaySound(true, AlertGate.RINGER_VIBRATE, AlertGate.FILTER_ALL))
    // Do Not Disturb: priority-only (2), total silence (3), alarms-only (4).
    for (filter in listOf(2, 3, 4)) {
      assertFalse(AlertGate.shouldPlaySound(true, AlertGate.RINGER_NORMAL, filter))
    }
  }

  @Test
  fun vibration_needs_the_setting_and_a_non_silent_ringer() {
    assertTrue(AlertGate.shouldVibrate(true, AlertGate.RINGER_NORMAL))
    assertTrue(AlertGate.shouldVibrate(true, AlertGate.RINGER_VIBRATE))
    assertFalse(AlertGate.shouldVibrate(true, AlertGate.RINGER_SILENT))
    assertFalse(AlertGate.shouldVibrate(false, AlertGate.RINGER_NORMAL))
  }

  // ── Intent validation ──

  @Test
  fun button_intents_need_our_action_a_known_command_and_a_session_id() {
    val action = FocusContract.ACTION_COMMAND
    for (command in listOf("Start", "Pause", "Resume", "Reset", "Skip")) {
      assertTrue(FocusContract.isValidButtonIntent(action, command, "s1"))
    }
    assertFalse(FocusContract.isValidButtonIntent("other.ACTION", "Pause", "s1"))
    assertFalse(FocusContract.isValidButtonIntent(null, "Pause", "s1"))
    assertFalse(FocusContract.isValidButtonIntent(action, "DeleteEverything", "s1"))
    assertFalse(FocusContract.isValidButtonIntent(action, null, "s1"))
    assertFalse(FocusContract.isValidButtonIntent(action, "Pause", null))
    assertFalse(FocusContract.isValidButtonIntent(action, "Pause", ""))
    // Reconcile is internal: a button can't send it.
    assertFalse(FocusContract.isValidButtonIntent(action, "Reconcile", "s1"))
  }

  @Test
  fun alarm_intents_must_match_the_session_they_were_scheduled_for() {
    val action = FocusContract.ACTION_ALARM
    assertTrue(FocusContract.isValidAlarmIntent(action, "s1", "s1"))
    assertFalse(FocusContract.isValidAlarmIntent(action, "s1", "s2"))
    assertFalse(FocusContract.isValidAlarmIntent(action, "s1", null))
    assertFalse(FocusContract.isValidAlarmIntent(action, null, null))
    assertFalse(FocusContract.isValidAlarmIntent(FocusContract.ACTION_COMMAND, "s1", "s1"))
  }

  // ── Clock maths ──

  @Test
  fun deadline_on_the_boot_clock_converts_to_wall_clock() {
    // 10 minutes left → 10 minutes after "now" on the wall clock.
    assertEquals(1_000_600_000L, Clock.deadlineToEpochMs(900_000L, 300_000L, 1_000_000_000L))
    // Already past the deadline → in the past.
    assertEquals(999_990_000L, Clock.deadlineToEpochMs(290_000L, 300_000L, 1_000_000_000L))
  }

  @Test
  fun colours_are_formatted_as_rgb_hex_without_alpha() {
    assertEquals("#0B7A77", DynamicPalette.toHex(0xFF0B7A77.toInt()))
    assertEquals("#000000", DynamicPalette.toHex(0xFF000000.toInt()))
    assertEquals("#FFFFFF", DynamicPalette.toHex(-1))
  }
}
