const {
  withAndroidManifest,
  withAndroidStyles,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// NOTE: This string is written directly as a .kt file.
// Dollar signs that are Kotlin string interpolations are escaped with \$ in JS template literals.
// NO regex patterns are used anywhere to avoid escape hell across JS -> Kotlin boundaries.
const KOTLIN_SHARE_ACTIVITY = `package com.runterya.rungorizer

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class ShareActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        overridePendingTransition(0, 0)
        super.onCreate(savedInstanceState)

        val action = intent?.action
        val type = intent?.type

        if (Intent.ACTION_SEND == action && type != null) {
            val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
                ?: intent.getStringExtra("android.intent.extra.TEXT")
                ?: intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()

            if (!sharedText.isNullOrBlank()) {
                handleSharedText(sharedText)
                return
            }
        }

        forwardToMainActivity()
    }

    override fun finish() {
        super.finish()
        overridePendingTransition(0, 0)
    }

    private fun handleSharedText(text: String) {
        val extractedUrl = extractUrl(text) ?: text.trim()
        val finalUrl = if (!extractedUrl.startsWith("http://") && !extractedUrl.startsWith("https://")) {
            "https://\${extractedUrl}"
        } else {
            extractedUrl
        }

        val domain = extractDomain(finalUrl)

        // ALWAYS save synchronously first — link must never be lost
        val (rowId, alreadyExists) = saveLinkToDb(finalUrl, domain)

        val toastMsg = when {
            alreadyExists -> "Link zaten kayitli: \${domain}"
            rowId >= 0   -> "Link kaydedildi: \${domain}"
            else         -> "Kaydetme hatasi, tekrar deneyin"
        }
        Toast.makeText(applicationContext, toastMsg, Toast.LENGTH_SHORT).show()

        // Background metadata fetch
        val effectiveRowId = if (rowId >= 0) rowId else getExistingRowId(finalUrl)
        if (effectiveRowId >= 0) {
            thread { fetchAndSaveMetadata(finalUrl, domain, effectiveRowId) }
        }

        // Decide UI behavior based on silent mode
        if (isSilentSaveEnabled()) {
            finish()
        } else {
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("newly_saved_url", finalUrl)
            }
            startActivity(mainIntent)
            finish()
        }
    }

    private fun getDbFile(): File {
        val expoDir = File(filesDir, "SQLite")
        if (!expoDir.exists()) expoDir.mkdirs()
        return File(expoDir, "linkgorize.db")
    }

    private fun openDb(readOnly: Boolean = false): SQLiteDatabase {
        val dbFile = getDbFile()
        val flags = if (readOnly) {
            SQLiteDatabase.OPEN_READONLY
        } else {
            SQLiteDatabase.OPEN_READWRITE or SQLiteDatabase.CREATE_IF_NECESSARY
        }
        return SQLiteDatabase.openDatabase(dbFile.path, null, flags)
    }

    private fun isSilentSaveEnabled(): Boolean {
        return try {
            val db = openDb(readOnly = true)
            val cursor = db.rawQuery("SELECT value FROM settings WHERE key = 'silent_save'", null)
            var silent = false
            if (cursor.moveToFirst()) silent = (cursor.getString(0) == "1")
            cursor.close()
            db.close()
            silent
        } catch (_: Exception) { false }
    }

    private fun getExistingRowId(urlStr: String): Long {
        return try {
            val db = openDb(readOnly = true)
            val cursor = db.rawQuery("SELECT id FROM links WHERE url = ?", arrayOf(urlStr))
            var id = -1L
            if (cursor.moveToFirst()) id = cursor.getLong(0)
            cursor.close()
            db.close()
            id
        } catch (_: Exception) { -1L }
    }

    /**
     * Returns Pair(rowId, alreadyExists).
     * rowId >= 0 + alreadyExists=false -> newly inserted
     * rowId = -1 + alreadyExists=true  -> already in DB
     * rowId = -1 + alreadyExists=false -> real error
     */
    private fun saveLinkToDb(urlStr: String, domain: String): Pair<Long, Boolean> {
        return try {
            // Do NOT call enableWriteAheadLogging() — expo-sqlite already manages WAL mode.
            // Calling it again on a WAL database throws an exception.
            val db = openDb(readOnly = false)

            db.execSQL(
                "CREATE TABLE IF NOT EXISTS links (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "url TEXT NOT NULL UNIQUE, " +
                "domain TEXT NOT NULL, " +
                "title TEXT, " +
                "description TEXT, " +
                "favicon TEXT, " +
                "og_image TEXT, " +
                "created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000), " +
                "is_read INTEGER NOT NULL DEFAULT 0, " +
                "is_favorite INTEGER NOT NULL DEFAULT 0, " +
                "tags TEXT)"
            )
            db.execSQL(
                "CREATE TABLE IF NOT EXISTS settings (" +
                "key TEXT PRIMARY KEY, " +
                "value TEXT NOT NULL)"
            )

            // Check if URL already exists before insert
            val existsCursor = db.rawQuery("SELECT id FROM links WHERE url = ?", arrayOf(urlStr))
            val alreadyExists = existsCursor.moveToFirst()
            existsCursor.close()

            if (alreadyExists) {
                db.close()
                return Pair(-1L, true)
            }

            val favicon = "https://www.google.com/s2/favicons?domain=\${domain}&sz=64"
            val values = ContentValues().apply {
                put("url", urlStr)
                put("domain", domain)
                put("title", domain)
                put("favicon", favicon)
                put("created_at", System.currentTimeMillis())
                put("is_read", 0)
                put("is_favorite", 0)
            }

            val rowId = db.insert("links", null, values)
            try { db.execSQL("PRAGMA wal_checkpoint(PASSIVE);") } catch (_: Exception) {}
            db.close()
            Pair(rowId, false)
        } catch (e: Exception) {
            e.printStackTrace()
            Pair(-1L, false)
        }
    }

    private fun fetchAndSaveMetadata(urlStr: String, domain: String, id: Long) {
        try {
            val conn = (URL(urlStr).openConnection() as HttpURLConnection).apply {
                connectTimeout = 8000
                readTimeout = 8000
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
            }
            val html = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()

            val title = extractMeta(html, "og:title")
                ?: extractMeta(html, "twitter:title")
                ?: extractTag(html, "title")
            val description = extractMeta(html, "og:description")
                ?: extractMeta(html, "twitter:description")
                ?: extractMeta(html, "description")
            val ogImage = extractMeta(html, "og:image")
                ?: extractMeta(html, "twitter:image")
            val favicon = "https://www.google.com/s2/favicons?domain=\${domain}&sz=64"

            val db = openDb(readOnly = false)
            val updateValues = ContentValues().apply {
                if (!title.isNullOrBlank()) put("title", title)
                if (!description.isNullOrBlank()) put("description", description)
                if (!ogImage.isNullOrBlank()) put("og_image", ogImage)
                put("favicon", favicon)
            }
            db.update("links", updateValues, "id = ?", arrayOf(id.toString()))
            try { db.execSQL("PRAGMA wal_checkpoint(PASSIVE);") } catch (_: Exception) {}
            db.close()
        } catch (_: Exception) {}
    }

    // --- Simple string-based HTML parsers (no regex, no escape issues) ---

    private fun extractMeta(html: String, prop: String): String? {
        val propLower = prop.lowercase()
        val htmlLower = html.lowercase()
        var searchFrom = 0
        while (searchFrom < htmlLower.length) {
            val metaStart = htmlLower.indexOf("<meta", searchFrom)
            if (metaStart < 0) break
            val metaEnd = htmlLower.indexOf(">", metaStart)
            if (metaEnd < 0) break
            val tag = html.substring(metaStart, metaEnd + 1)
            val tagLower = tag.lowercase()
            val hasProp = tagLower.contains("property=\"\${propLower}\"") ||
                          tagLower.contains("property='\${propLower}'") ||
                          tagLower.contains("name=\"\${propLower}\"") ||
                          tagLower.contains("name='\${propLower}'")
            if (hasProp) {
                val content = extractAttr(tag, "content")
                if (!content.isNullOrBlank()) return content
            }
            searchFrom = metaEnd + 1
        }
        return null
    }

    private fun extractAttr(tag: String, attr: String): String? {
        val tagLower = tag.lowercase()
        val attrLower = attr.lowercase()
        for (quote in listOf('"', '\'')) {
            val pat = "\${attrLower}=\${quote}"
            val idx = tagLower.indexOf(pat)
            if (idx >= 0) {
                val start = idx + pat.length
                val end = tag.indexOf(quote, start)
                if (end > start) return tag.substring(start, end).trim()
            }
        }
        return null
    }

    private fun extractTag(html: String, tag: String): String? {
        val t = tag.lowercase()
        val h = html.lowercase()
        val openTag = "<" + t
        val closeTag = "</" + t + ">"
        val tagStart = h.indexOf(openTag)
        if (tagStart < 0) return null
        val openEnd = h.indexOf(">", tagStart)
        if (openEnd < 0) return null
        val closeIdx = h.indexOf(closeTag, openEnd)
        if (closeIdx <= openEnd) return null
        return html.substring(openEnd + 1, closeIdx).trim().takeIf { it.isNotBlank() }
    }

    // Simple URL extraction using indexOf — no regex escape issues
    private fun extractUrl(text: String): String? {
        val cleaned = text.trim()
        val httpIdx = cleaned.indexOf("https://").let { if (it >= 0) it else cleaned.indexOf("http://") }
        if (httpIdx < 0) return null
        val fromHttp = cleaned.substring(httpIdx)
        val endIdx = fromHttp.indexOfFirst { it.isWhitespace() }
        return if (endIdx > 0) fromHttp.substring(0, endIdx) else fromHttp
    }

    private fun extractDomain(urlStr: String): String {
        return try {
            var host = Uri.parse(urlStr).host ?: urlStr
            if (host.startsWith("www.")) host = host.substring(4)
            host
        } catch (_: Exception) { urlStr }
    }

    private fun forwardToMainActivity() {
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(mainIntent)
        finish()
    }
}
`;

function withShareActivity(config) {
  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    if (Array.isArray(mainApplication.activity)) {
      const mainActivity = mainApplication.activity.find(
        (a) => a.$['android:name'] === '.MainActivity'
      );
      if (mainActivity && Array.isArray(mainActivity['intent-filter'])) {
        mainActivity['intent-filter'] = mainActivity['intent-filter'].filter((filter) => {
          const actions = filter.action || [];
          return !actions.some((act) => act.$['android:name'] === 'android.intent.action.SEND');
        });
      }

      mainApplication.activity = mainApplication.activity.filter(
        (a) => a.$['android:name'] !== '.ShareActivity'
      );

      mainApplication.activity.push({
        $: {
          'android:name': '.ShareActivity',
          'android:theme': '@style/Theme.Transparent',
          'android:taskAffinity': '',
          'android:launchMode': 'singleInstance',
          'android:noHistory': 'true',
          'android:excludeFromRecents': 'true',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
            category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
            data: [{ $: { 'android:mimeType': 'text/plain' } }],
          },
        ],
      });
    }

    return config;
  });

  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults.resources.style || [];
    const idx = styles.findIndex((s) => s.$.name === 'Theme.Transparent');
    const transparentStyle = {
      $: { name: 'Theme.Transparent', parent: 'android:Theme.Translucent.NoTitleBar' },
      item: [
        { $: { name: 'android:windowIsTranslucent' }, _: 'true' },
        { $: { name: 'android:windowBackground' }, _: '@android:color/transparent' },
        { $: { name: 'android:windowContentOverlay' }, _: '@null' },
        { $: { name: 'android:windowNoTitle' }, _: 'true' },
        { $: { name: 'android:windowIsFloating' }, _: 'true' },
        { $: { name: 'android:backgroundDimEnabled' }, _: 'false' },
        { $: { name: 'android:windowAnimationStyle' }, _: '@null' },
        { $: { name: 'android:windowDisablePreview' }, _: 'true' },
      ],
    };
    if (idx >= 0) styles[idx] = transparentStyle;
    else styles.push(transparentStyle);
    config.modResults.resources.style = styles;
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const targetDir = path.join(
        config.modRequest.projectRoot,
        'android', 'app', 'src', 'main', 'java', 'com', 'runterya', 'rungorizer'
      );
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'ShareActivity.kt'), KOTLIN_SHARE_ACTIVITY, 'utf8');
      return config;
    },
  ]);

  return config;
}

module.exports = withShareActivity;
