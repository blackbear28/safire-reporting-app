const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Enhanced Expo plugin to ensure react-native-gesture-handler is properly linked in EAS builds
 * This addresses the TurboModuleRegistry.getEnforcing(...): 'RNGestureHandlerModule' could not be found error
 */
function withGestureHandler(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const mainApplicationPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/com/invictus28/safireapp/MainApplication.java'
      );

      // Create the MainApplication.java if it doesn't exist with gesture handler support
      const ensureMainApplicationContent = `
package com.invictus28.safireapp;

import android.app.Application;
import android.content.Context;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.config.ReactFeatureFlags;
import com.facebook.soloader.SoLoader;
import com.swmansion.gesturehandler.RNGestureHandlerPackage;
import expo.modules.ApplicationLifecycleDispatcher;
import expo.modules.ReactNativeHostWrapper;

import java.lang.reflect.InvocationTargetException;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {
  private final ReactNativeHost mReactNativeHost = new ReactNativeHostWrapper(
      this,
      new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          // Ensure gesture handler is explicitly added
          packages.add(new RNGestureHandlerPackage());
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        @Override
        protected Boolean isHermesEnabled() {
          return BuildConfig.IS_HERMES_ENABLED;
        }
      });

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    if (BuildConfig.DEBUG) {
      ReactFeatureFlags.enableLogBox = false;
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this);
  }

  @Override
  public void onConfigurationChanged(android.content.res.Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig);
  }
}
`;

      try {
        // Check if MainApplication.java exists
        if (fs.existsSync(mainApplicationPath)) {
          let mainApplicationContent = fs.readFileSync(mainApplicationPath, 'utf8');
          
          // Check if gesture handler is already properly configured
          if (!mainApplicationContent.includes('com.swmansion.gesturehandler.RNGestureHandlerPackage')) {
            console.log('Adding gesture handler import to MainApplication.java');
            
            // Add gesture handler import
            if (!mainApplicationContent.includes('import com.swmansion.gesturehandler.RNGestureHandlerPackage;')) {
              mainApplicationContent = mainApplicationContent.replace(
                /(import com\.facebook\.react\.ReactApplication;)/,
                '$1\nimport com.swmansion.gesturehandler.RNGestureHandlerPackage;'
              );
            }

            // Add gesture handler package to the packages list
            if (!mainApplicationContent.includes('new RNGestureHandlerPackage()')) {
              // Try multiple patterns to find where to add the package
              const packagePatterns = [
                /(List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);)/,
                /(packages\.add\(new MainReactPackage\(\)\);)/,
                /(return packages;)/
              ];

              let patternFound = false;
              for (const pattern of packagePatterns) {
                if (pattern.test(mainApplicationContent)) {
                  if (pattern.source.includes('return packages')) {
                    mainApplicationContent = mainApplicationContent.replace(
                      pattern,
                      '          packages.add(new RNGestureHandlerPackage());\n          return packages;'
                    );
                  } else {
                    mainApplicationContent = mainApplicationContent.replace(
                      pattern,
                      '$1\n          packages.add(new RNGestureHandlerPackage());'
                    );
                  }
                  patternFound = true;
                  break;
                }
              }

              if (!patternFound) {
                console.warn('Could not find suitable location to add gesture handler package');
              }
            }

            fs.writeFileSync(mainApplicationPath, mainApplicationContent);
            console.log('Successfully updated MainApplication.java with gesture handler support');
          }
        } else {
          // Create the directory structure if it doesn't exist
          const mainApplicationDir = path.dirname(mainApplicationPath);
          fs.mkdirSync(mainApplicationDir, { recursive: true });
          
          // Write the complete MainApplication.java with gesture handler support
          fs.writeFileSync(mainApplicationPath, ensureMainApplicationContent);
          console.log('Created MainApplication.java with gesture handler support');
        }
      } catch (error) {
        console.error('Error configuring gesture handler in MainApplication.java:', error);
      }

      return config;
    },
  ]);
}

module.exports = withGestureHandler;
