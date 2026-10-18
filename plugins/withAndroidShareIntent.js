const {
  withAndroidManifest,
  withDangerousMod,
  withMainActivity,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SHARE_HANDLER_ACTIVITY_KOTLIN = `package com.runterya.rungorize

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.UUID
import kotlin.concurrent.thread

class ShareHandlerActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Make window completely transparent with no animations
    window.setBackgroundDrawableResource(android.R.color.transparent)

    val targetIntent = intent ?: run {
      finish()
      return
    }

    val action = targetIntent.action
    if (action != Intent.ACTION_SEND && action != Intent.ACTION_SEND_MULTIPLE) {
      finish()
      return
    }

    // 1. Extract shared text
    var sharedText = targetIntent.getStringExtra(Intent.EXTRA_TEXT)
    if (sharedText.isNullOrEmpty()) {
      sharedText = targetIntent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
    }
    if (sharedText.isNullOrEmpty() && targetIntent.clipData != null && targetIntent.clipData!!.itemCount > 0) {
      sharedText = targetIntent.clipData!!.getItemAt(0).text?.toString()
    }
    if (sharedText.isNullOrEmpty() && targetIntent.data != null) {
      sharedText = targetIntent.data.toString()
    }

    // 2. Extract web URL
    val rawUrl = extractUrl(sharedText)
    if (rawUrl.isNullOrEmpty()) {
      Toast.makeText(applicationContext, "⚠️ Geçerli bir bağlantı bulunamadı", Toast.LENGTH_SHORT).show()
      finish()
      return
    }

    // 3. Read share_mode from SQLite settings
    val shareMode = getShareMode()

    if (shareMode == "interactive") {
      // Interactive Mode: Forward to MainActivity / modal/add-link
      try {
        val encoded = URLEncoder.encode(rawUrl, "UTF-8")
        val mainIntent = Intent(Intent.ACTION_VIEW, Uri.parse("rungorize://modal/add-link?prefilledUrl=$encoded")).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
          setPackage(packageName)
        }
        startActivity(mainIntent)
      } catch (e: Exception) {
        e.printStackTrace()
      }
      finish()
      return
    }

    // 4. Silent Mode: Finish IMMEDIATELY so the screen never changes!
    finish()

    // 5. Process and save to SQLite in background
    val appContext = applicationContext
    thread(isDaemon = false) {
      handleSilentSave(appContext, rawUrl)
    }
  }

  private fun extractUrl(text: String?): String? {
    if (text.isNullOrEmpty()) return null
    val regex = Regex("""(https?://[^\\s<>"{}|\\\\^\`]+|(?:www\\.|(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}/)[^\\s<>"{}|\\\\^\`]+)""", RegexOption.IGNORE_CASE)
    val match = regex.find(text) ?: return null
    var url = match.value

    while (url.isNotEmpty() && url.last() in ".,!?:;)>]") {
      url = url.substring(0, url.length - 1)
    }

    if (!url.startsWith("http://", ignoreCase = true) && !url.startsWith("https://", ignoreCase = true)) {
      url = "https://" + url.removePrefix("www.")
    }
    return url
  }

  private fun getShareMode(): String {
    var mode = "silent"
    try {
      val dbFile = getDatabasePath("rungorize.db")
      if (dbFile.exists()) {
        val db = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY)
        val cursor = db.rawQuery("SELECT value FROM settings WHERE key = 'share_mode'", null)
        if (cursor.moveToFirst()) {
          mode = cursor.getString(0) ?: "silent"
        }
        cursor.close()
        db.close()
      }
    } catch (e: Exception) {
      // fallback to silent
    }
    return mode
  }

  private fun cleanTrackingParams(rawUrl: String): String {
    try {
      val uri = Uri.parse(rawUrl)
      val builder = uri.buildUpon().clearQuery()
      val trackingKeys = setOf(
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
        "fbclid", "gclid", "dclid", "igshid", "mc_eid", "mc_cid", "_hsenc", "_hsmi",
        "yclid", "_openstat", "spm", "ref", "ref_src", "ref_url", "si", "s", "t"
      )
      for (param in uri.queryParameterNames) {
        if (!trackingKeys.contains(param.lowercase()) && !param.lowercase().startsWith("utm_")) {
          for (value in uri.getQueryParameters(param)) {
            builder.appendQueryParameter(param, value)
          }
        }
      }
      var res = builder.build().toString()
      if (res.endsWith("#") || res.endsWith("?")) {
        res = res.substring(0, res.length - 1)
      }
      return res
    } catch (e: Exception) {
      return rawUrl
    }
  }

  private fun handleSilentSave(context: android.content.Context, originalUrl: String) {
    try {
      val cleanUrl = cleanTrackingParams(originalUrl)
      val dbFile = context.getDatabasePath("rungorize.db")
      dbFile.parentFile?.mkdirs()
      val db = SQLiteDatabase.openOrCreateDatabase(dbFile, null)

      // Ensure SQLite tables
      db.execSQL("""
        CREATE TABLE IF NOT EXISTS folders (
          id TEXT PRIMARY KEY,
          domain TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          icon_url TEXT,
          color TEXT NOT NULL,
          is_pinned INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      """.trimIndent())

      db.execSQL("""
        CREATE TABLE IF NOT EXISTS links (
          id TEXT PRIMARY KEY,
          folder_id TEXT NOT NULL,
          original_url TEXT NOT NULL,
          clean_url TEXT UNIQUE NOT NULL,
          title TEXT,
          description TEXT,
          image_url TEXT,
          favicon_url TEXT,
          is_favorite INTEGER DEFAULT 0,
          is_read INTEGER DEFAULT 0,
          notes TEXT,
          tags TEXT DEFAULT '[]',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
        );
      """.trimIndent())

      val now = System.currentTimeMillis()

      // 1. Resolve domain information
      val parsedUri = Uri.parse(cleanUrl)
      var host = parsedUri.host?.lowercase() ?: "diger"
      if (host.startsWith("www.")) {
        host = host.substring(4)
      }

      val (displayName, folderColor) = getDomainMetadata(host)
      val faviconUrl = "https://www.google.com/s2/favicons?domain=$host&sz=128"

      // 2. Upsert folder
      var folderId: String? = null
      val folderCursor = db.rawQuery("SELECT id FROM folders WHERE domain = ?", arrayOf(host))
      if (folderCursor.moveToFirst()) {
        folderId = folderCursor.getString(0)
        db.execSQL("UPDATE folders SET updated_at = ? WHERE id = ?", arrayOf(now, folderId))
      }
      folderCursor.close()

      if (folderId == null) {
        folderId = UUID.randomUUID().toString().replace("-", "").substring(0, 16)
        val cvFolder = ContentValues().apply {
          put("id", folderId)
          put("domain", host)
          put("display_name", displayName)
          put("icon_url", faviconUrl)
          put("color", folderColor)
          put("is_pinned", 0)
          put("created_at", now)
          put("updated_at", now)
        }
        db.insert("folders", null, cvFolder)
      }

      // 3. Check existing link
      var isExisting = false
      var existingLinkId: String? = null
      val linkCursor = db.rawQuery("SELECT id FROM links WHERE clean_url = ?", arrayOf(cleanUrl))
      if (linkCursor.moveToFirst()) {
        isExisting = true
        existingLinkId = linkCursor.getString(0)
      }
      linkCursor.close()

      if (isExisting) {
        db.execSQL("UPDATE links SET updated_at = ? WHERE id = ?", arrayOf(now, existingLinkId))
        db.close()

        Handler(Looper.getMainLooper()).post {
          Toast.makeText(context, "✓ Bağlantı güncellendi", Toast.LENGTH_SHORT).show()
        }
        return
      }

      // 4. Save new link with default title first
      val newLinkId = UUID.randomUUID().toString().replace("-", "").substring(0, 16)
      val cvLink = ContentValues().apply {
        put("id", newLinkId)
        put("folder_id", folderId)
        put("original_url", originalUrl)
        put("clean_url", cleanUrl)
        put("title", displayName)
        put("description", "$displayName üzerinden kaydedildi")
        put("image_url", null as String?)
        put("favicon_url", faviconUrl)
        put("is_favorite", 0)
        put("is_read", 0)
        put("notes", null as String?)
        put("tags", "[]")
        put("created_at", now)
        put("updated_at", now)
      }
      db.insert("links", null, cvLink)
      db.close()

      Handler(Looper.getMainLooper()).post {
        Toast.makeText(context, "✓ Bağlantı kaydedildi", Toast.LENGTH_SHORT).show()
      }

      // 5. Scrape OpenGraph metadata in background and update record
      fetchAndApplyOpenGraph(context, newLinkId, cleanUrl)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  private fun getDomainMetadata(host: String): Pair<String, String> {
    return when {
      host == "x.com" || host == "twitter.com" -> Pair("X (Twitter)", "#3b82f6")
      host == "youtube.com" || host == "youtu.be" -> Pair("YouTube", "#ef4444")
      host == "github.com" -> Pair("GitHub", "#8b5cf6")
      host == "instagram.com" -> Pair("Instagram", "#ec4899")
      host == "reddit.com" -> Pair("Reddit", "#f97316")
      host == "linkedin.com" -> Pair("LinkedIn", "#06b6d4")
      host == "medium.com" -> Pair("Medium", "#10b981")
      host == "facebook.com" || host == "fb.com" -> Pair("Facebook", "#3b82f6")
      host == "tiktok.com" -> Pair("TikTok", "#ec4899")
      host == "threads.net" -> Pair("Threads", "#71717a")
      host == "spotify.com" -> Pair("Spotify", "#10b981")
      else -> {
        val name = host.split(".").firstOrNull()?.replaceFirstChar { it.uppercase() } ?: host
        Pair(name, "#3b82f6")
      }
    }
  }

  private fun fetchAndApplyOpenGraph(context: android.content.Context, linkId: String, urlStr: String) {
    try {
      val url = URL(urlStr)
      val conn = url.openConnection() as HttpURLConnection
      conn.connectTimeout = 4000
      conn.readTimeout = 4000
      conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 Rungorize/1.0")
      conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
      conn.instanceFollowRedirects = true

      if (conn.responseCode in 200..299) {
        val reader = BufferedReader(InputStreamReader(conn.inputStream, "UTF-8"))
        val htmlBuilder = StringBuilder()
        var line: String?
        var bytesRead = 0
        while (reader.readLine().also { line = it } != null) {
          htmlBuilder.append(line).append("\\n")
          bytesRead += line!!.length
          if (bytesRead > 250000) break
        }
        reader.close()
        conn.disconnect()

        val html = htmlBuilder.toString()
        val title = extractMeta(html, "og:title") ?: extractMeta(html, "twitter:title") ?: extractHtmlTitle(html)
        val description = extractMeta(html, "og:description") ?: extractMeta(html, "twitter:description")
        val image = extractMeta(html, "og:image") ?: extractMeta(html, "twitter:image")

        if (!title.isNullOrEmpty() || !image.isNullOrEmpty()) {
          val dbFile = context.getDatabasePath("rungorize.db")
          val db = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READWRITE)
          val cv = ContentValues()
          if (!title.isNullOrEmpty()) cv.put("title", title)
          if (!description.isNullOrEmpty()) cv.put("description", description)
          if (!image.isNullOrEmpty()) cv.put("image_url", image)
          db.update("links", cv, "id = ?", arrayOf(linkId))
          db.close()
        }
      }
    } catch (e: Exception) {
      // Best-effort
    }
  }

  private fun extractMeta(html: String, property: String): String? {
    val pattern1 = Regex("""<meta[^>]+(?:property|name)=["']\${Regex.escape(property)}["'][^>]+content=["']([^"']+)["']""", RegexOption.IGNORE_CASE)
    val match1 = pattern1.find(html)
    if (match1 != null) return unescapeHtml(match1.groupValues[1].trim())

    val pattern2 = Regex("""<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']\${Regex.escape(property)}["']""", RegexOption.IGNORE_CASE)
    val match2 = pattern2.find(html)
    if (match2 != null) return unescapeHtml(match2.groupValues[1].trim())

    return null
  }

  private fun extractHtmlTitle(html: String): String? {
    val pattern = Regex("""<title[^>]*>([^<]+)</title>""", RegexOption.IGNORE_CASE)
    val match = pattern.find(html) ?: return null
    return unescapeHtml(match.groupValues[1].trim())
  }

  private fun unescapeHtml(str: String): String {
    return str
      .replace("&amp;", "&")
      .replace("&quot;", "\\"")
      .replace("&#39;", "'")
      .replace("&lt;", "<")
      .replace("&gt;", ">")
      .replace("&mdash;", "—")
      .replace("&ndash;", "–")
  }
}
`;

const withAndroidShareIntent = (config) => {
  // 1. Write ShareHandlerActivity.kt to Android native source folder
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const targetDir = path.join(
        projectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'runterya',
        'rungorize'
      );
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(targetDir, 'ShareHandlerActivity.kt'),
        SHARE_HANDLER_ACTIVITY_KOTLIN,
        'utf8'
      );
      return config;
    },
  ]);

  // 2. Configure AndroidManifest.xml:
  // Register ShareHandlerActivity with ACTION_SEND and Theme.Translucent
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (!mainApplication) return config;

    if (!mainApplication.activity) {
      mainApplication.activity = [];
    }

    // Remove any existing ShareHandlerActivity to prevent duplicates
    mainApplication.activity = mainApplication.activity.filter(
      (a) => a.$?.['android:name'] !== '.ShareHandlerActivity'
    );

    // Remove ACTION_SEND intent filters from MainActivity
    mainApplication.activity.forEach((act) => {
      if (act.$?.['android:name'] === '.MainActivity' && act['intent-filter']) {
        act['intent-filter'] = act['intent-filter'].filter((filter) => {
          const actions = filter.action || [];
          return !actions.some((a) => a.$?.['android:name'] === 'android.intent.action.SEND');
        });
      }
    });

    // Add ShareHandlerActivity
    mainApplication.activity.push({
      $: {
        'android:name': '.ShareHandlerActivity',
        'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
        'android:noHistory': 'true',
        'android:excludeFromRecents': 'true',
        'android:exported': 'true',
        'android:launchMode': 'singleInstance',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          data: [
            { $: { 'android:mimeType': 'text/plain' } },
            { $: { 'android:mimeType': 'text/*' } },
          ],
        },
      ],
    });

    return config;
  });

  // 3. Ensure MainActivity.kt has deep link support for interactive shares
  config = withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('import android.content.Intent')) {
      contents = contents.replace(
        /package [^\n]+/,
        `$&\n\nimport android.content.Intent`
      );
    }

    if (!contents.includes('override fun onNewIntent')) {
      const onNewIntentMethod = `
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
`;
      const lastBraceIndex = contents.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        contents =
          contents.substring(0, lastBraceIndex) +
          onNewIntentMethod +
          contents.substring(lastBraceIndex);
      }
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withAndroidShareIntent;
