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

        // Fallback to normal activity if nothing was processed
        forwardToMainActivity()
    }

    private fun handleSharedText(text: String) {
        val extractedUrl = extractUrl(text) ?: text.trim()
        val finalUrl = if (!extractedUrl.startsWith("http://") && !extractedUrl.startsWith("https://")) {
            "https://$extractedUrl"
        } else {
            extractedUrl
        }

        val domain = extractDomain(finalUrl)

        // Check silent_save setting in SQLite
        val isSilent = isSilentSaveEnabled()

        if (isSilent) {
            // Save in background directly to SQLite
            thread {
                saveLinkToDb(finalUrl, domain)
            }

            // Show native Android Toast immediately
            Toast.makeText(applicationContext, "🔗 Link kaydedildi: $domain", Toast.LENGTH_SHORT).show()

            // Finish immediately without rendering any UI
            finish()
        } else {
            // Forward to MainActivity to open the app UI
            forwardToMainActivity()
        }
    }

    private fun getDbFile(): File {
        val expoDb = File(filesDir, "SQLite/linkgorize.db")
        if (expoDb.exists()) return expoDb
        val defaultDb = getDatabasePath("linkgorize.db")
        if (defaultDb.exists()) return defaultDb
        expoDb.parentFile?.mkdirs()
        return expoDb
    }

    private fun isSilentSaveEnabled(): Boolean {
        return try {
            val dbFile = getDbFile()
            if (!dbFile.exists()) {
                return false
            }
            val db = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY)
            val cursor = db.rawQuery("SELECT value FROM settings WHERE key = 'silent_save'", null)
            var silent = false
            if (cursor.moveToFirst()) {
                val value = cursor.getString(0)
                silent = (value == "1")
            }
            cursor.close()
            db.close()
            silent
        } catch (e: Exception) {
            false
        }
    }

    private fun saveLinkToDb(urlStr: String, domain: String) {
        var rowId = -1L
        try {
            val dbFile = getDbFile()
            dbFile.parentFile?.mkdirs()
            val db = SQLiteDatabase.openOrCreateDatabase(dbFile, null)
            
            // Ensure tables exist
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

            val defaultFavicon = "https://www.google.com/s2/favicons?domain=$domain&sz=64"
            val values = ContentValues().apply {
                put("url", urlStr)
                put("domain", domain)
                put("favicon", defaultFavicon)
                put("created_at", System.currentTimeMillis())
                put("is_read", 0)
                put("is_favorite", 0)
            }

            rowId = db.insertWithOnConflict("links", null, values, SQLiteDatabase.CONFLICT_REPLACE)
            db.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Background metadata fetch
        if (rowId != -1L) {
            fetchAndSaveMetadata(urlStr, domain, rowId)
        }
    }

    private fun fetchAndSaveMetadata(urlStr: String, domain: String, id: Long) {
        try {
            val url = URL(urlStr)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 8000
                readTimeout = 8000
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

            val favicon = "https://www.google.com/s2/favicons?domain=$domain&sz=64"

            val dbFile = getDbFile()
            val db = SQLiteDatabase.openOrCreateDatabase(dbFile, null)
            val updateValues = ContentValues().apply {
                if (!title.isNullOrBlank()) put("title", title)
                if (!description.isNullOrBlank()) put("description", description)
                if (!ogImage.isNullOrBlank()) put("og_image", ogImage)
                put("favicon", favicon)
            }
            db.update("links", updateValues, "id = ?", arrayOf(id.toString()))
            db.close()
        } catch (e: Exception) {
            // Ignore background fetch errors
        }
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
            if (matcher.find()) {
                return matcher.group(1)?.trim()
            }
        }
        return null
    }

    private fun extractTag(html: String, tag: String): String? {
        val pattern = Pattern.compile("""<$tag[^>]*>([^<]+)</$tag>""", Pattern.CASE_INSENSITIVE)
        val matcher = pattern.matcher(html)
        return if (matcher.find()) matcher.group(1)?.trim() else null
    }

    private fun extractUrl(text: String): String? {
        val pattern = Pattern.compile("""https?://[^\\s]+""", Pattern.CASE_INSENSITIVE)
        val matcher = pattern.matcher(text)
        return if (matcher.find()) matcher.group(0) else null
    }

    private fun extractDomain(urlStr: String): String {
        return try {
            val uri = Uri.parse(urlStr)
            var host = uri.host ?: urlStr
            if (host.startsWith("www.")) host = host.substring(4)
            host
        } catch (e: Exception) {
            urlStr
        }
    }

    private fun forwardToMainActivity() {
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            action = intent.action
            type = intent.type
            putExtras(intent)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(mainIntent)
        finish()
    }
}
`;

function withShareActivity(config) {
  // 1. AndroidManifest.xml modification
  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    // Remove any SEND intent filter from MainActivity
    if (Array.isArray(mainApplication.activity)) {
      const mainActivity = mainApplication.activity.find(
        (a) => a.$['android:name'] === '.MainActivity'
      );
      if (mainActivity && Array.isArray(mainActivity['intent-filter'])) {
        mainActivity['intent-filter'] = mainActivity['intent-filter'].filter((filter) => {
          const actions = filter.action || [];
          return !actions.some(
            (act) => act.$['android:name'] === 'android.intent.action.SEND' ||
                     act.$['android:name'] === 'android.intent.action.android.intent.action.SEND'
          );
        });
      }

      // Remove existing ShareActivity if any
      mainApplication.activity = mainApplication.activity.filter(
        (a) => a.$['android:name'] !== '.ShareActivity'
      );

      // Add transparent ShareActivity with SEND intent filter
      mainApplication.activity.push({
        $: {
          'android:name': '.ShareActivity',
          'android:theme': '@style/Theme.Transparent',
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
    
    const existingIndex = styles.findIndex((s) => s.$.name === 'Theme.Transparent');
    const transparentStyle = {
      $: {
        name: 'Theme.Transparent',
        parent: 'android:Theme.Translucent.NoTitleBar',
      },
      item: [
        { $: { name: 'android:windowIsTranslucent' }, _: 'true' },
        { $: { name: 'android:windowBackground' }, _: '@android:color/transparent' },
        { $: { name: 'android:windowContentOverlay' }, _: '@null' },
        { $: { name: 'android:windowNoTitle' }, _: 'true' },
        { $: { name: 'android:windowIsFloating' }, _: 'true' },
        { $: { name: 'android:backgroundDimEnabled' }, _: 'false' },
      ],
    };

    if (existingIndex >= 0) {
      styles[existingIndex] = transparentStyle;
    } else {
      styles.push(transparentStyle);
    }

    config.modResults.resources.style = styles;
    return config;
  });

  // 3. Write ShareActivity.kt to android package directory
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const targetDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'runterya',
        'rungorizer'
      );
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'ShareActivity.kt'), KOTLIN_SHARE_ACTIVITY, 'utf8');
      return config;
    },
  ]);

  return config;
}

module.exports = withShareActivity;
