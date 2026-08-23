Pod::Spec.new do |s|
  s.name = 'ICloudBackupStorage'
  s.version = '1.0.0'
  s.summary = 'App-owned iCloud document backup storage.'
  s.description = 'Small iOS adapter for the Personal Nutrition Tracker backup file.'
  s.author = 'Personal Nutrition Tracker'
  s.homepage = 'https://docs.expo.dev/modules/'
  s.platforms = { :ios => '16.4' }
  s.source = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
