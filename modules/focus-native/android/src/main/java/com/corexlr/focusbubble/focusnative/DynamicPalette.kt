package com.corexlr.focusbubble.focusnative

import android.content.Context
import android.os.Build

/**
 * Reads the wallpaper-based "Material You" colours on Android 12+. Returns null on older
 * versions. Only used when the user turns on "Use wallpaper colours".
 */
object DynamicPalette {
  fun read(context: Context): Map<String, String>? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return null
    val ids =
        mapOf(
            "accent1_100" to android.R.color.system_accent1_100,
            "accent1_200" to android.R.color.system_accent1_200,
            "accent1_300" to android.R.color.system_accent1_300,
            "accent1_600" to android.R.color.system_accent1_600,
            "accent1_700" to android.R.color.system_accent1_700,
            "accent1_800" to android.R.color.system_accent1_800,
            "accent1_900" to android.R.color.system_accent1_900,
            "neutral1_50" to android.R.color.system_neutral1_50,
            "neutral1_100" to android.R.color.system_neutral1_100,
            "neutral1_800" to android.R.color.system_neutral1_800,
            "neutral1_900" to android.R.color.system_neutral1_900,
            "neutral2_100" to android.R.color.system_neutral2_100,
            "neutral2_700" to android.R.color.system_neutral2_700,
        )
    return ids.mapValues { toHex(context.getColor(it.value)) }
  }

  /** 0xAARRGGBB → "#RRGGBB". */
  fun toHex(color: Int): String = String.format("#%06X", color and 0xFFFFFF)
}
