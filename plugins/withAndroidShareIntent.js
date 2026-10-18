const { withMainActivity } = require('@expo/config-plugins');

const withAndroidShareIntent = (config) => {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Add required imports if missing
    if (!contents.includes('import android.content.Intent')) {
      contents = contents.replace(
        /package [^\n]+/,
        `$&\n\nimport android.content.Intent\nimport android.net.Uri\nimport java.net.URLEncoder`
      );
    }

    // 2. Add handleSendIntent and onNewIntent to MainActivity
    if (!contents.includes('handleSendIntent')) {
      const helperMethod = `
  private fun handleSendIntent(targetIntent: Intent?) {
    if (targetIntent != null && targetIntent.action == Intent.ACTION_SEND && targetIntent.type?.startsWith("text/") == true) {
      val sharedText = targetIntent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrEmpty()) {
        try {
          val encoded = URLEncoder.encode(sharedText, "UTF-8")
          targetIntent.data = Uri.parse("rungorize://share?text=$encoded")
        } catch (e: Exception) {
          e.printStackTrace()
        }
      }
    }
  }

  override fun onNewIntent(intent: Intent) {
    handleSendIntent(intent)
    super.onNewIntent(intent)
  }
`;

      // Insert before the last closing bracket of MainActivity class
      const lastBraceIndex = contents.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        contents =
          contents.substring(0, lastBraceIndex) +
          helperMethod +
          contents.substring(lastBraceIndex);
      }
    }

    // 3. Call handleSendIntent(intent) inside onCreate
    if (!contents.includes('handleSendIntent(intent)')) {
      contents = contents.replace(
        /(super\.onCreate\([^\)]*\))/,
        `handleSendIntent(intent)\n    $1`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withAndroidShareIntent;
