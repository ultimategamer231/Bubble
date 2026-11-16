package com.corexlr.focusbubble.focusnative

import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import java.util.TimeZone

/**
 * The device clocks the timer relies on (docs/ARCHITECTURE.md §5).
 *
 * - elapsedRealtime: counts milliseconds since boot, including sleep. It never jumps when
 *   the user changes the time, which is why deadlines are stored on this clock.
 * - bootCount: goes up by one on every restart. If it changed, elapsedRealtime started
 *   again from zero and old deadlines mean nothing.
 */
object Clock {
  fun elapsedMs(): Long = SystemClock.elapsedRealtime()

  fun epochMs(): Long = System.currentTimeMillis()

  fun bootCount(context: Context): Int =
      try {
        Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT)
      } catch (e: Exception) {
        0
      }

  /** Minutes east of UTC right now (includes daylight saving). */
  fun tzOffsetMin(epochMs: Long): Int = TimeZone.getDefault().getOffset(epochMs) / 60_000

  /** Converts a deadline on the boot clock to wall-clock time, for notification chronometers. */
  fun deadlineToEpochMs(deadlineElapsedMs: Long, nowElapsedMs: Long, nowEpochMs: Long): Long =
      nowEpochMs + (deadlineElapsedMs - nowElapsedMs)

  fun now(context: Context): Map<String, Any> {
    val epoch = epochMs()
    return mapOf(
        "elapsedMs" to elapsedMs().toDouble(),
        "epochMs" to epoch.toDouble(),
        "bootCount" to bootCount(context),
        "tzOffsetMin" to tzOffsetMin(epoch),
    )
  }
}
