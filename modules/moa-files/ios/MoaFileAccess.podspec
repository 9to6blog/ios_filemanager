Pod::Spec.new do |s|
  s.name = 'MoaFileAccess'
  s.version = '0.1.0'
  s.summary = 'User-authorized document management for Moa Files'
  s.description = s.summary
  s.author = 'Moa Files'
  s.homepage = 'https://github.com/9to6blog/ios_filemanager'
  s.license = { :type => 'MIT' }
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/9to6blog/ios_filemanager.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'UIKit', 'QuickLook', 'AVKit', 'UniformTypeIdentifiers'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
end
