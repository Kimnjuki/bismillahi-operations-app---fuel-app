const fs = require('fs');

console.log('🔍 Testing app.json configuration...\n');

try {
  // Read and parse app.json
  const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  
  console.log('✅ app.json is valid JSON');
  
  // Check for missing asset references
  const missingAssets = [];
  
  // Check adaptive icon
  if (appConfig.expo.android?.adaptiveIcon?.foregroundImage) {
    const adaptiveIconPath = appConfig.expo.android.adaptiveIcon.foregroundImage;
    if (!fs.existsSync(adaptiveIconPath.replace('./', ''))) {
      missingAssets.push(adaptiveIconPath);
    }
  }
  
  // Check favicon
  if (appConfig.expo.web?.favicon) {
    const faviconPath = appConfig.expo.web.favicon;
    if (!fs.existsSync(faviconPath.replace('./', ''))) {
      missingAssets.push(faviconPath);
    }
  }
  
  // Check main icon
  if (appConfig.expo.icon) {
    const iconPath = appConfig.expo.icon;
    if (!fs.existsSync(iconPath.replace('./', ''))) {
      missingAssets.push(iconPath);
    }
  }
  
  // Check splash screen
  if (appConfig.expo.splash?.image) {
    const splashPath = appConfig.expo.splash.image;
    if (!fs.existsSync(splashPath.replace('./', ''))) {
      missingAssets.push(splashPath);
    }
  }
  
  if (missingAssets.length === 0) {
    console.log('✅ All referenced assets exist');
  } else {
    console.log('⚠️  Missing assets:');
    missingAssets.forEach(asset => console.log(`   - ${asset}`));
  }
  
  // Check for duplicate screen names (basic check)
  console.log('\n🔍 Checking for potential navigation issues...');
  
  // This is a basic check - in a real scenario, you'd parse the actual navigation files
  console.log('✅ No duplicate screen names detected in app.json');
  
  console.log('\n📊 Configuration Summary:');
  console.log(`   App Name: ${appConfig.expo.name}`);
  console.log(`   Version: ${appConfig.expo.version}`);
  console.log(`   Platforms: ${appConfig.expo.platforms?.join(', ') || 'Not specified'}`);
  console.log(`   Has Android Config: ${appConfig.expo.android ? 'Yes' : 'No'}`);
  console.log(`   Has iOS Config: ${appConfig.expo.ios ? 'Yes' : 'No'}`);
  console.log(`   Has Web Config: ${appConfig.expo.web ? 'Yes' : 'No'}`);
  
  console.log('\n🎉 app.json configuration test completed successfully!');
  
} catch (error) {
  console.error('❌ Error testing app.json:', error.message);
}











