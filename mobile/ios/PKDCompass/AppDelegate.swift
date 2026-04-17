import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // 1. Try standard Expo discovery
    if let url = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry") {
      print("📍 Resolved via Expo: \(url)")
      return url
    }

    // 2. Try to read from config.json (set by mobile-access.js)
    if let configPath = Bundle.main.path(forResource: "config", ofType: "json"),
       let configData = try? Data(contentsOf: URL(fileURLWithPath: configPath)),
       let configJson = try? JSONSerialization.jsonObject(with: configData) as? [String: Any],
       let apiUrl = configJson["apiUrl"] as? String {
        
        // Convert http://ip:3000 to http://ip:8081 for Metro bundler
        // unless it's a tunnel (which usually proxies both)
        var metroUrl = apiUrl.replacingOccurrences(of: ":3000", with: ":8081")
        if !metroUrl.contains("8081") && !metroUrl.contains(".io") && !metroUrl.contains(".net") {
            metroUrl = metroUrl + ":8081"
        }
        
        let bundlePath = metroUrl + "/index.bundle?platform=ios&dev=true&minify=false"
        if let url = URL(string: bundlePath) {
            print("🔗 Resolved via config.json: \(url)")
            return url
        }
    }

    // 3. Last resort fallback
    let fallback = URL(string: "http://10.0.0.111:8081/index.bundle?platform=ios&dev=true&minify=false")
    print("⚠️ Discovery failed, using hard-coded fallback: \(String(describing: fallback))")
    return fallback
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
