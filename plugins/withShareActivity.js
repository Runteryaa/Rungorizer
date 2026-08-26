const {
  withAndroidManifest,
  withAndroidStyles,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

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
import java.util.regex.Pattern
import kotlin.concurrent.thread

class ShareActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        overridePendingTransition(0, 0)
        super.onCreate(savedInstanceState)

        val intent = intent
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

        // Fallback — just open main app
        forwardToMainActivity()
    }

    override fun finish() {
        super.finish()
        overridePendingTransition(0, 0)
    }

    private fun handleSharedText(text: String) {
        val extractedUrl = extractUrl(text) ?: text.trim()
        val finalUrl = if (!extractedUrl.startsWith("http://") && !extractedUrl.startsWith("https://")) {
            "https://\$extractedUrl"
        } else {
            extractedUrl
        }

        val domain = extractDomain(finalUrl)

        // ALWAYS save synchronously FIRST — regardless of silent mode
        // This guarantees the link is never lost
        val rowId = saveLinkToDb(finalUrl, domain)

        // Show toast feedback
        val toastMsg = if (rowId >= 0) "🔗 Link kaydedildi: \$domain" else "⚠️ Link zaten kayıtlı: \$domain"
        Toast.makeText(applicationContext, toastMsg, Toast.LENGTH_SHORT).show()

        // Start background metadata fetch regardless of silent mode
        val effectiveRowId = if (rowId >= 0) rowId else getExistingRowId(finalUrl)
        if (effectiveRowId >= 0) {
            thread {
                fetchAndSaveMetadata(finalUrl, domain, effectiveRowId)
            }
        }

        // THEN decide: silent mode → just close, else open app UI
        val isSilent = isSilentSaveEnabled()
        if (isSilent) {
            finish()
        } else {
            // Open main activity so user can see the newly added link
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
        if (!expoDir.exists()) {
            expoDir.mkdirs()
        }
        return File(expoDir, "linkgorize.db")
    }

    private fun isSilentSaveEnabled(): Boolean {
        return try {
            val dbFile = getDbFile()
            if (!dbFile.exists()) return false
            val db = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY)
            val cursor = db.rawQuery("SELECT value FROM settings WHERE key = 'silent_save'", null)
            var silent = false
            if (cursor.moveToFirst()) {
                silent = (cursor.getString(0) == "1")
            }
            cursor.close()
            db.close()
            silent
        } catch (e: Exception) {
            false
        }
    }

    private fun getExistingRowId(urlStr: String): Long {
        return try {
            val dbFile = getDbFile()
            if (!dbFile.exists()) return -1L
            val db = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY)
            val cursor = db.rawQuery("SELECT id FROM links WHERE url = ?", arrayOf(urlStr))
            var id = -1L
            if (cursor.moveToFirst()) {
                id = cursor.getLong(0)
            }
            cursor.close()
            db.close()
            id
        } catch (e: Exception) {
            -1L
        }
    }

    private fun saveLinkToDb(urlStr: String, domain: String): Long {
        var rowId = -1L
        try {
            val dbFile = getDbFile()
            val db = SQLiteDatabase.openOrCreateDatabase(dbFile, null)
            db.enableWriteAheadLogging()
            db.execSQL("PRAGMA journal_mode = WAL;")

            db.execSQL("""
                CREATE TABLE IF NOT EXISTS links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL UNIQUE,
                    domain TEXT NOT NULL,
                    title TEXT,
                    description TEXT,
                    favicon TEXT,
                    og_image TEXT,
                    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
                    is_read INTEGER NOT NULL DEFAULT 0,
                    is_favorite INTEGER NOT NULL DEFAULT 0,
                    tags TEXT
                );
            """.trimIndent())

            db.execSQL("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            """.trimIndent())

            val defaultFavicon = "https://www.google.com/s2/favicons?domain=\$domain&sz=64"
            val values = ContentValues().apply {
                put("url", urlStr)
                put("domain", domain)
                put("title", domain)
                put("favicon", defaultFavicon)
                put("created_at", System.currentTimeMillis())
                put("is_read", 0)
                put("is_favorite", 0)
            }

            // CONFLICT_IGNORE: if URL already exists, do NOT overwrite, return -1
            rowId = db.insertWithOnConflict("links", null, values, SQLiteDatabase.CONFLICT_IGNORE)

            db.execSQL("PRAGMA wal_checkpoint(FULL);")
            db.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return rowId
    }

    private fun fetchAndSaveMetadata(urlStr: String, domain: String, id: Long) {
        try {
            val url = URL(urlStr)
            val conn = (url.openConnection() as HttpURLConnection).apply {
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
            val favicon = "https://www.google.com/s2/favicons?domain=\$domain&sz=64"

            val dbFile = getDbFile()
            val db = SQLiteDatabase.openOrCreateDatabase(dbFile, null)
            db.enableWriteAheadLogging()
            val updateValues = ContentValues().apply {
                if (!title.isNullOrBlank()) put("title", title)
                if (!description.isNullOrBlank()) put("description", description)
                if (!ogImage.isNullOrBlank()) put("og_image", ogImage)
                put("favicon", favicon)
            }
            db.update("links", updateValues, "id = ?", arrayOf(id.toString()))
            db.execSQL("PRAGMA wal_checkpoint(FULL);")
            db.close()
        } catch (_: Exception) {}
    }

    private fun extractMeta(html: String, prop: String): String? {
        val patterns = arrayOf(
            Pattern.compile("""<meta[^>]+property=["']$prop["'][^>]+content=["']([^"']+)["']""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""<meta[^>]+content=["']([^"']+)["'][^>]+property=["']$prop["']""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""<meta[^>]+name=["']$prop["'][^>]+content=["']([^"']+)["']""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""<meta[^>]+content=["']([^"']+)["'][^>]+name=["']$prop["']""", Pattern.CASE_INSENSITIVE)
        )
        for (pattern in patterns) {
            val matcher = pattern.matcher(html)
            if (matcher.find()) return matcher.group(1)?.trim()
        }
        return null
    }

    private fun extractTag(html: String, tag: String): String? {
        val matcher = Pattern.compile("""<$tag[^>]*>([^<]+)</$tag>""", Pattern.CASE_INSENSITIVE).matcher(html)
        return if (matcher.find()) matcher.group(1)?.trim() else null
    }

    private fun extractUrl(text: String): String? {
        val matcher = Pattern.compile("""https?://\\S+""", Pattern.CASE_INSENSITIVE).matcher(text)
        return if (matcher.find()) matcher.group(0) else null
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
  // 1. AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    if (Array.isArray(mainApplication.activity)) {
      // Remove SEND intent filter from MainActivity (we handle it in ShareActivity)
      const mainActivity = mainApplication.activity.find(
        (a) => a.$['android:name'] === '.MainActivity'
      );
      if (mainActivity && Array.isArray(mainActivity['intent-filter'])) {
        mainActivity['intent-filter'] = mainActivity['intent-filter'].filter((filter) => {
          const actions = filter.action || [];
          return !actions.some(
            (act) => act.$['android:name'] === 'android.intent.action.SEND'
          );
        });
      }

      // Remove any existing ShareActivity declaration
      mainApplication.activity = mainApplication.activity.filter(
        (a) => a.$['android:name'] !== '.ShareActivity'
      );

      // Register ShareActivity — isolated task, no history, no preview
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

  // 2. Add Theme.Transparent to styles.xml
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

  // 3. Write ShareActivity.kt
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
