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

    // 2. Remove any previous handleSendIntent and onNewIntent to allow clean updates
    contents = contents.replace(
      /\n\s*private fun handleSendIntent[\s\S]*?override fun onNewIntent[\s\S]*?\n\s*\}/g,
      ''
    );

    const helperMethods = `
  private fun handleSendIntent(targetIntent: Intent?) {
    if (targetIntent == null) return
    val action = targetIntent.action
    if (action == Intent.ACTION_SEND || action == Intent.ACTION_SEND_MULTIPLE) {
      var sharedText: String? = targetIntent.getStringExtra(Intent.EXTRA_TEXT)
      if (sharedText.isNullOrEmpty()) {
        sharedText = targetIntent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
      }
      if (sharedText.isNullOrEmpty() && targetIntent.clipData != null && targetIntent.clipData!!.itemCount > 0) {
        sharedText = targetIntent.clipData!!.getItemAt(0).text?.toString()
      }
      if (sharedText.isNullOrEmpty() && targetIntent.data != null) {
        sharedText = targetIntent.data.toString()
      }

      if (!sharedText.isNullOrEmpty()) {
        try {
          val encoded = URLEncoder.encode(sharedText, "UTF-8")
          targetIntent.action = Intent.ACTION_VIEW
          targetIntent.data = Uri.parse("rungorize://share?text=$encoded")
          targetIntent.addCategory(Intent.CATEGORY_DEFAULT)
          targetIntent.addCategory(Intent.CATEGORY_BROWSABLE)
        } catch (e: Exception) {
          e.printStackTrace()
        }
      }
    }
  }

  override fun onNewIntent(intent: Intent) {
    handleSendIntent(intent)
    setIntent(intent)
    super.onNewIntent(intent)
  }
`;

    // Insert before the last closing bracket of MainActivity class
    const lastBraceIndex = contents.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      contents =
        contents.substring(0, lastBraceIndex) +
        helperMethods +
        contents.substring(lastBraceIndex);
    }

    // 3. Inject handleSendIntent(intent) into onCreate before setTheme
    if (!contents.includes('handleSendIntent(intent)\n    // Set the theme') && !contents.includes('handleSendIntent(intent)\n    setTheme')) {
      contents = contents.replace(
        /(override fun onCreate\(savedInstanceState: Bundle\?\) \{)/,
        `$1\n    handleSendIntent(intent)`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withAndroidShareIntent;
